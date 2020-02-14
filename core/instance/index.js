import { observe, set, del } from '../observer'
import Watcher from '../observer/watcher'
import Dep from '../observer/dep'
import { isPlainObject, isFunction, hasOwn } from '../../shared/utils'
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
    this.initProps()
    // Vue 在此处先初始化 methods, why ?
    this.initData()
    this.initComputed()
    this.initWatcher()
    this.initMethods()
  }

  initProps () {
    // TODO: 完善
    const { props } = this.$options
    if (!props) return
    this.$props = props
    proxy(this, '$props')
  }

  initData () {
    const { data, props } = this.$options
    if (!data) return

    this._data = isFunction(data) ? data.call(this, this) : data

    if (!isPlainObject(this._data)) {
      this._data = {}
      console.error(
        'data functions should return an object:\n' +
        'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function'
      )
    }

    Object.keys(this._data).forEach(key => {
      if (props && hasOwn(props, key)) {
        console.error(
          `The data property "${key}" is already declared as a prop. ` +
          'Use prop default value instead.'
        )
      } else {
        proxy(this, '_data', key)
      }
    })

    observe(this._data)
  }

  initComputed () {
    const { props, computed } = this.$options
    if (!computed) return

    this._computedWatchers = {}
    Object.keys(computed).forEach(key => {
      if (key in this) {
        if (hasOwn(this._data, key)) {
          console.error(`The computed property "${key}" is already defined in data.`)
        } else if (props && hasOwn(props, key)) {
          console.error(`The computed property "${key}" is already defined as a prop.`)
        }
      } else {
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
      }
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
        console.error(`watcher ${key} 不是一个函数或者对象`)
        return
      }

      // TODO: 后续增加生命周期以及 $watch 后，需要增加 teardown 方法，组件卸载前要将 computed 和 watch 都销毁
      // eslint-disable-next-line no-new
      new Watcher(this, key, fHandler, fOptions, false)
    })
  }

  initMethods () {
    const { methods, props, computed } = this.$options
    if (!methods) return

    Object.keys(methods).forEach(key => {
      if (hasOwn(this._data, key)) {
        console.error(`Method "${key}" has already been defined as a data property.`)
        return
      } else if (props && hasOwn(props, key)) {
        console.error(`Method "${key}" is already defined as a prop.`)
        return
      } else if (computed && hasOwn(computed, key)) {
        console.error(`Method "${key}" is already defined as a computed.`)
        return
      }

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

// 将目标值代理到 target 上
// 如果 keyOfSourceTarget 存在，只代理这个 key 到 target 上，否则将 target[sourceKey] 所有属性代理至 target 上
// 比如可以通过 vm.xx 直接访问 props, data, computed 等等
function proxy (target, sourceKey, keyOfSourceTarget) {
  const sourceTarget = target[sourceKey]

  if (keyOfSourceTarget) {
    def(keyOfSourceTarget)
  } else {
    Object.keys(sourceTarget).forEach(def)
  }

  function def (key) {
    Object.defineProperty(target, key, {
      get () {
        return sourceTarget[key]
      },
      set (val) {
        sourceTarget[key] = val
      }
    })
  }
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
