import { initLifecycle, callHook } from './lifecycle'
import { initState } from './state'
import { initRender } from './render'

let uid = 0
export function initMixin (Vue) {
  Vue.prototype._init = function (options) {
    this._uid = uid++
    this._isVue = true

    // TODO: 合并策略
    this.$options = options

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
