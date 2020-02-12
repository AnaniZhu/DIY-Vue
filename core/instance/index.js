import { observe, set, del } from '../observer'
import Watcher from '../observer/watcher'
import Dep from '../observer/dep'
import { isPlainObject, isFunction } from '../../shared/utils'
import { nextTick } from '../util'

// TODO: 临时初始化 Vue 实例，后续修改
let id = 0
export default class Vue {
  constructor (options) {
    this.id = ++id
    this.$options = options
    this.init()
  }

  init () {
    this.initState()
    this.initRender()
  }

  initState () {
    this.initData()
    this.initMethods()
    this.initComputed()
    this.initWatcher()
  }

  initData () {
    const { data } = this.$options
    if (!data) return

    this._data = isFunction(data) ? data.call(this, this) : data
    observe(this._data)
    proxy(this, '_data')
  }

  initComputed () {
    const computed = this.$options.computed
    if (!computed) return

    this._computedWatchers = {}
    Object.keys(computed).forEach(key => {
      if (key in this) {
        console.error(`computed ${key} 属性在实例上已经被声明过`)
        return
      }

      const val = computed[key]
      const isFn = isFunction(val)
      const isObj = isPlainObject(computed)

      if (!isFn && !isObj) return

      const getter = isFn ? val : val.get
      /**
       * 如果不考虑 computed 的缓存特性，都不需要定义为 watcher, 只需要把 computed 的每一个 key 代理到 vm 上，定义 getter 就好了
       * 为了实现缓存的特性，就加入了很大的改动, 比如:
       * - 为了检测到所依赖的值的变化，来判断缓存的值是否失效，就要引入 watcher
       * - 引入了 watcher 之后，需要自定义 getter 来判断缓存有效性，再决定走用户定义的 get 还是缓存
       * - 再考虑到 computed 互相依赖的情况，会形成嵌套 watcher。
       * - watcher getter 中的依赖更改后，为了正确触发 watcher update，就要引入栈(Dep 里的 targetStack)的概念，用来存放这些嵌套 watchers
       * - 还存在一个依赖属性被多个 computed 所依赖，这些 computed 就被 renderWatcher 所依赖
       * - 当依赖属性发生改变后，通知 computed(lazy watcher) update, 可能会重复调用 renderWatcher。
       * - 因为解决上述多种原因，所以 watcher 上也要维护 deps, 由所依赖项统一收集 watchers 并 update，加上去重，就不会重复更新
       * - 而当 watchers 要维护 deps 后，又得处理去重以及清理操作...
       */
      this._computedWatchers[key] = new Watcher(this, getter, () => {
        // this[key] = val.get()
      }, { lazy: true })

      const computedGetter = createComputedGetter(key)
      const desc = isFn ? { get: computedGetter } : { get: computedGetter, set: val.set }

      Object.defineProperty(this, key, desc)
    })
  }

  initWatcher () {
    const { watch } = this.$options
    if (!watch) return

    Object.keys(watch).forEach(key => {
      const config = watch[key]
      let fHandler
      let fOptions = {}
      if (isFunction(config)) {
        fHandler = config
      } else if (isPlainObject(config)) {
        const { handler, ...options } = config
        fHandler = handler
        fOptions = options
      } else {
        console.error(`watcher ${key} 属性在实例上已经被声明过`)
        return
      }

      // eslint-disable-next-line no-new
      new Watcher(this, key, fHandler, fOptions, false)
    })
  }

  initMethods () {
    const { methods } = this.$options
    if (!methods) return

    Object.keys(methods).forEach(key => {
      let fn = methods[key]
      if (isFunction(fn)) {
        this[key] = fn.bind(this)
      } else {
        console.error(`methods ${key} 不是一个函数`)
      }
    })
  }

  initRender () {
    this._watcher = new Watcher(this, function () {
      const html = this.$options.render.call(this)
      console.log('render')
      document.querySelector(this.$options.el).innerHTML = html
    }, () => {}, null, true)
  }

  $set () {
    return set.apply(this, arguments)
  }

  $delete () {
    return del.apply(this, arguments)
  }

  $nextTick (cb) {
    return nextTick(cb, this)
  }
}

// 将 target[sourceKey] 所有的值都代理到 target 上
// 比如可以通过 vm.xx 直接访问 props, data, computed 等等
function proxy (target, sourceKey) {
  const sourceTarget = target[sourceKey]
  Object.keys(sourceTarget).forEach(key => {
    Object.defineProperty(target, key, {
      get () {
        return sourceTarget[key]
      },
      set (val) {
        sourceTarget[key] = val
      }
    })
  })
}

function createComputedGetter (key) {
  return function () {
    const watcher = this._computedWatchers[key]

    if (watcher.dirty) {
      watcher.evaluate()
    }

    if (Dep.target) {
      watcher.depend()
    }

    return watcher.value
  }
}
