export function initRender (vm) {
}

export function renderMixin (Vue) {
  Vue.prototype._render = function () {
    // TODO: vnode 实现
    let vnode = this.$options.render.call(this)
    console.log('render')
    return vnode
  }
}
