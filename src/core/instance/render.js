import { installRenderHelpers } from './render-helpers'
import { resolveSlots } from './render-helpers/resolve-slots'
import { createElement } from '../vdom/create-element'
import { patch } from '../vdom/patch'
import { nextTick } from '../util/next-tick'

export function initRender (vm) {
  vm._vnode = null
  vm._c = (tag, data, children) => createElement(vm, tag, data, children)

  // 获取 slots
  const parentVnode = vm.$options._parentVnode
  if (parentVnode) {
    vm.$slots = resolveSlots(parentVnode.componentOptions.children)

    // Vue 源码实现在 _render 中才进行 $scopedSlots 赋值
    vm.$scopedSlots = parentVnode.data ? parentVnode.data.scopedSlots : {}
  }
}
export function renderMixin (Vue) {
  // 注入一些 compiler 生成的 render 中所用到的一些工具方法
  installRenderHelpers(Vue.prototype)

  Vue.prototype._render = function () {
    // TODO: vnode 实现
    let vnode = this.$options.render.call(this, this._c)
    console.log('render')
    return vnode
  }

  Vue.prototype.__patch__ = patch

  Vue.prototype.$nextTick = function (fn) {
    return nextTick(fn, this)
  }
}
