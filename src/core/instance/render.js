import { installRenderHelpers } from './render-helpers'

export function initRender (vm) {
  vm._vnode = null
  // TODO:
  vm._c = () => {}
}

export function renderMixin (Vue) {
  // 注入一些 compiler 生成的 render 中所用到的一些工具方法
  installRenderHelpers(Vue.prototype)

  Vue.prototype._render = function () {
    // TODO: vnode 实现
    let vnode = this.$options.render.call(this)
    console.log('render')
    return vnode
  }
}
