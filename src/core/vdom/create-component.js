import Vue from '../instance'
import VNode from './vnode'
import { extractPropsFromVNodeData } from './helper'

export function createComponent (componentOptions, data, children) {
  const { name, props } = componentOptions

  // 提取父组件传给子组件的 propsData
  const propsData = extractPropsFromVNodeData(props, data)

  // 提取父组件给子组件绑定的监听事件
  // TODO: 后续增加 nativeOn 功能
  const listeners = data && data.on

  let vnode = new VNode({
    tag: `DIY-Vue-Component-${name || Vue.cid}`,
    data,
    children,
    componentOptions: { propsData, listeners, children }
  })

  vnode.componentInstance = new Vue({
    ...componentOptions,
    _isComponent: true, // 标识该实例是个子组件
    _parentVnode: vnode // 保留自身 vnode 的引用
  })

  return vnode
}
