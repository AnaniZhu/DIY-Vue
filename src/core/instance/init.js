import { initLifecycle, callHook } from './lifecycle'
import { initState } from './state'
import { initRender } from './render'

let uid = 0
export function initMixin (Vue) {
  Vue.prototype._init = function (options = {}) {
    this._uid = uid++
    this._isVue = true

    // TODO: 合并策略
    this.$options = options

    // 如果当前组件是子组件的话，初始化一些属性
    if (options && options._isComponent) {
      initInternalComponent(this)
    }

    initLifecycle(this)
    initRender(this)
    callHook(this, 'beforeCreate')
    initState(this)
    callHook(this, 'created')

    if (options.el) {
      this.$mount(options.el)
    }
  }
}

function initInternalComponent (vm) {
  const opts = vm.$options
  const { propsData /* listeners, children */ } = opts._parentVnode.componentOptions

  opts.propsData = propsData
  // opts._parentListeners = listeners
  // opts._renderChildren = children
}
