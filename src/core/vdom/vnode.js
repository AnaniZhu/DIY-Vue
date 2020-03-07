// 标识不同 vnode 的类型
// 此处跟 Vue 源码实现不一致，Vue 源码通过 text 字段来判断是否是文本节点，根据 hook 字段判断是否是组件，其余都是元素节点
export const ELEMENT_TYPE = 1
export const TEXT_TYPE = 2
export const COMPONENT_TYPE = 3

export default class VNode {
  constructor ({ tag, type, data, children, text, ele, isComment, componentOptions }) {
    this.tag = tag
    this.type = type
    this.data = data
    this.children = children
    this.ele = ele
    this.text = text

    this.componentOptions = componentOptions

    // 实例会修改此属性
    this.parent = null
    this.componentInstance = null
  }
}

// 空 node 用于占位，后续方便 patch
export function createEmptyVNode (text) {
  return new VNode({ text, isComment: true })
}

export function createTextVNode (text) {
  return new VNode({ text, type: TEXT_TYPE })
}
