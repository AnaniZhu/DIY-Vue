import { observe, set, del, defineReactive } from '../observer'
import Watcher from '../observer/watcher'
import Dep from '../observer/dep'
import { isPlainObject, isFunction, hasOwn, noop, map } from 'shared/utils'
import { warn, validateProp, normalizeProps } from '../util'

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
  const { props /* propsData */ } = vm.$options
  if (!props) return
  vm.$options.props = normalizeProps(props, vm)
  const _props = vm._props = {}
  // Vue 源码在此处将 props 所有的 key 都进行了缓存，后续组件更新直接遍历这个数组，本实现不考虑
  // 同时 Vue 采用了 toggleObserving 方法关闭 observe，目的是为了不去检测模板里的对象字面量。
  // 因为 prop 可能传一个对象字面量，observe 这个值是没意义的。
  // 本实现暂不考虑此方面的性能问题
  map(props, (key, val) => {
    const value = validateProp(key, vm)
    defineReactive(_props, key, value)
  })
  proxy(vm, '_props')
}

function initData (vm) {
  const { data, props } = vm.$options
  if (!data) return

  vm._data = isFunction(data) ? data.call(vm, vm) : data

  if (!isPlainObject(vm._data)) {
    vm._data = {}
    warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      this
    )
  }

  Object.keys(vm._data).forEach(key => {
    if (props && hasOwn(props, key)) {
      warn(
        `The data property "${key}" is already declared as a prop. ` +
        'Use prop default value instead.',
        this
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
        warn(`The computed property "${key}" is already defined in data.`, this)
      } else if (props && hasOwn(props, key)) {
        warn(`The computed property "${key}" is already defined as a prop.`, this)
      }
    } else {
      const val = computed[key]
      const isFn = isFunction(val)
      const isObj = isPlainObject(computed)

      if (!isFn && !isObj) return

      const getter = isFn ? val : val.get
      /**
     * 如果不考虑 computed 的缓存特性，都不需要定义为 watcher, 只需要把 computed 的每一个 key 代理到 vm 上，定义 getter 就好了
     * 为了实现缓存的特性，就产生了很大的改动, 比如:
     * - 为了检测到所依赖的值的变化，来判断缓存的值是否失效，就要引入 watcher
     * - 引入了 watcher 之后，需要自定义 getter 来判断缓存有效性，再决定走用户定义的 getter 还是缓存
     * - 再考虑到存在 computed 互相依赖的情况，会形成嵌套 watcher。
     * - watcher getter 中的依赖更改后，为了正确触发 watcher update，就要引入栈(Dep 里的 targetStack)的概念，用来存放这些嵌套 watchers
     * - 如何保证嵌套 watchers 被 dep 正确收集，且不能产生重复更新?。
     * - 因为解决上述多种问题，决定 watcher 上也维护一份 deps,  dep 执行 depend 时同时将自身(dep)存入 watcher 中，
     * - 嵌套 watcher 时，子级 watcher 的 deps 把该父级 watcher 也收集进去，就可以解决上述问题。
     * - 而当 watchers 要维护 deps 后，又得处理去重以及清理操作...
     *
     *
     * 在未引入 scheduler 的概念之前，面对嵌套 watcher 情况，为了解决的 computed(lazy watcher) 正确更新的问题，我一开始尝试了以下两个思路:
     * 思路一:
     * - dep 只收集当前的 Dep.target, 每个 watcher 维护一个自己的 dep, 用来存放上一层嵌套 watcher，
     * - 然后被依赖的响应式属性发生改变，通知该 watcher, watcher update 后进而通过自身的 dep 再通知上一个嵌套的 watcher, 以此类推。
     * - 结果存在问题，看如下例子:
     * - data: {num: 1}, computed: { count (){return num}},  render() {return this.num + this.count}
     * - 当发生 render 时，Dep.target 是 renderWatcher, 此时按顺序:
     * - 先触发 num 的 get，num 的 dep 执行 depend 收集 renderWatcher
     * - 然后触发 count 的 get，count 的 dep 收集 renderWatcher, 同时将 Dep.target 赋值为 countWatcher
     * - count get 又会触发 num 的 get，num 的 dep 执行 depend 收集 Dep.target (countWatcher)
     * - 此时 num dep: [renderWatcher, countWatcher], count dep: [renderWatcher]
     * - 当 num 重新赋值, dep notify 对 watchers  排序更新，先触发 countWatcher 的 update，将 countWatcher dirty 设置为 true
     * - 同时触发 countWatcher 上 dep 收集到的 renderWatcher 的 update，而此时 num dep 里还有一个 renderWatcher, 导致重复更新
     * - 综上所述，思路一失败。
     * 思路二:
     * - 引入栈的概念，将嵌套 watchers 按顺序入栈，触发响应式属性 dep depend 时，将栈内 watcher 全部收集。
     * - 结果依旧存在问题，看如下例子:
     * - data: {num: 1}, computed: { count (){return num * 2}, text () {return count + '次'}}, render() {return this.num + this.count + this.text}
     * - 当发生 render 时，renderWatcher 入栈，先触发 num get, num 的 dep 执行 depend, 此时 num dep 的 subs 为 [renderWatcher]
     * - 然后触发 count get，countWatcher 入栈，count get 触发 num get， num dep 开始 depend 收集栈内 watchers: [renderWatcher, countWatcher]
     * - 去重过滤后，num 的 dep subs 为: [renderWatcher, countWatcher]
     * - count get 完成，同时将 countWatcher 的 dirty 属性设为 false，countWatcher 出栈
     * - 再然后触发 text get, textWatcher 入栈，而 text 依赖 count，触发 count 的 get，
     * - 但是 countWatcher 的 dirty 属性为 false，会直接走缓存，导致就不会执行用户定义的 count getter, 自然不会触发 num get
     * - 此时导致依赖没有正确收集到，num 理应要收集到 textWatcher
     * - 所以思路二也失败
     *
     * Vue 的官方实现就相当于是上面两种思路结合的变种。
     * 响应式属性是唯一的依赖来源，watchers 通过 deps 属性当做响应式属性的载体，
     * 用栈结构来处理嵌套 watchers 的关系，就像一个个桥梁连接到一起，每个桥梁上都有载体存放这对应的依赖，
     * 这样依赖(响应式属性)就可以正确的访问到这座桥上的每一个 watcher
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
      warn(`Method "${key}" has already been defined as a data property.`, this)
      return
    } else if (props && hasOwn(props, key)) {
      warn(`Method "${key}" is already defined as a prop.`, this)
      return
    } else if (computed && hasOwn(computed, key)) {
      warn(`Method "${key}" is already defined as a computed.`, this)
      return
    }

    let fn = methods[key]
    if (isFunction(fn)) {
      vm[key] = fn.bind(vm)
    } else {
      warn(`methods ${key} 不是一个函数`, this)
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
      warn(`Error in watch '${expOrFn}': vm methods 中不存在名为 ${fnName} 的函数`, this)
      return
    }
  }

  return new Watcher(vm, expOrFn, handler, options, false)
}

export function stateMixin (Vue) {
  Object.defineProperties(Vue.prototype, {
    $data: {
      get () { return this._data },
      set () { warn('Avoid replacing instance root $data. Use nested data properties instead.', this) }
    },
    $props: {
      get () { return this._props },
      set () { warn('$props is readonly.', this) }
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
