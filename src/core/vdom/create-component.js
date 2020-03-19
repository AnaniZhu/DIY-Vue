import Vue from '../instance'
import VNode, { COMPONENT_TYPE } from './vnode'
import { extractPropsFromVNodeData } from './helper'

export function createComponent (componentOptions, data, children) {
  const { name, props } = componentOptions

  // 提取父组件传给子组件的 propsData
  const propsData = extractPropsFromVNodeData(props, data) || {}

  // 提取父组件给子组件绑定的监听事件
  // TODO: 后续增加 nativeOn 功能
  const listeners = data && data.on

  let vnode = new VNode({
    tag: `DIY-Vue-Component-${name || Vue.cid}`,
    type: COMPONENT_TYPE,
    data,
    children,
    componentOptions: {
      Ctor: Vue, // 后续处理 Vue.extend 的情况
      propsData,
      listeners,
      children,
      options: componentOptions // 这个 componentOptions 是组件对象
    }
  })

  return vnode
}
