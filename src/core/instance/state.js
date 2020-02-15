import { observe, set, del } from '../observer'
import Watcher from '../observer/watcher'
import Dep from '../observer/dep'
import { isPlainObject, isFunction, hasOwn, noop } from '../../shared/utils'

export function initState (vm) {
  vm._watchers = []
  initProps(vm)
  // Vue 在此处先初始化 methods, why ?
  initData(vm)
  initComputed(vm)
  initWatcher(vm)
  initMethods(vm)
}

function initProps (vm) {
  // TODO: 完善
  const { props } = vm.$options
  if (!props) return
  vm._props = props
  proxy(vm, '$props')
}

function initData (vm) {
  const { data, props } = vm.$options
  if (!data) return

  vm._data = isFunction(data) ? data.call(vm, vm) : data

  if (!isPlainObject(vm._data)) {
    vm._data = {}
    console.error(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function'
    )
  }

  Object.keys(vm._data).forEach(key => {
    if (props && hasOwn(props, key)) {
      console.error(
        `The data property "${key}" is already declared as a prop. ` +
        'Use prop default value instead.'
      )
    } else {
      proxy(vm, '_data', key)
    }
  })

  observe(vm._data)
}

function initComputed (vm) {
  const { props, computed } = vm.$options
  if (!computed) return

  vm._computedWatchers = {}
  Object.keys(computed).forEach(key => {
    if (key in vm) {
      if (hasOwn(vm._data, key)) {
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
      vm._computedWatchers[key] = new Watcher(vm, getter, () => {
      // vm[key] = val.get()
      }, { lazy: true })

      const computedGetter = createComputedGetter(key)
      const desc = isFn ? { get: computedGetter } : { get: computedGetter, set: val.set }

      Object.defineProperty(vm, key, desc)
    }
  })
}

function initWatcher (vm) {
  const { watch } = vm.$options
  if (!watch) return

  Object.keys(watch).forEach(key => {
    let configs = watch[key]
    if (!Array.isArray(configs)) configs = [configs]

    configs.forEach(config => createWatcher(vm, key, config))
  })
}

function initMethods (vm) {
  const { methods, props, computed } = vm.$options
  if (!methods) return

  Object.keys(methods).forEach(key => {
    if (hasOwn(vm._data, key)) {
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
      vm[key] = fn.bind(vm)
    } else {
      console.error(`methods ${key} 不是一个函数`)
    }
  })
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

function createWatcher (vm, expOrFn, handler, options) {
  /**
   * watch 的值可能存在三种形式
   * string: methods 其中的一个函数名
   * function: 回调函数
   * object: 配置对象
   */

  if (isPlainObject(handler)) {
    options = handler
    handler = options.handler
  }

  if (typeof handler === 'string') {
    let fnName = handler
    handler = vm.$options.methods[handler]
    if (!handler) {
      console.error(`Error in watch '${expOrFn}': vm methods 中不存在名为 ${fnName} 的函数`)
      return
    }
  }

  return new Watcher(vm, expOrFn, handler, options, false)
}

export function stateMixin (Vue) {
  Object.defineProperties(Vue.prototype, {
    $data: {
      get () { return this._data },
      set () { console.log('Avoid replacing instance root $data. Use nested data properties instead.') }
    },
    $props: {
      get () { return this._props },
      set () { console.log('$props is readonly.') }
    }
  })

  Vue.prototype.$set = set
  Vue.prototype.$delete = del

  Vue.prototype.$watch = function (expOrFn, handler, options = {}) {
    // 此处实现将 immediate 触发挪至 watcher 构造函数中
    const watcher = createWatcher(this, expOrFn, handler, options)
    return watcher
      ? function unWatchFn () { watcher.teardown() }
      : noop
  }
}
