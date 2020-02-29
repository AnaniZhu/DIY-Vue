
export default class VNode {
  constructor ({ tag, data, children, text, ele, isComment, componentInstance, componentOptions }) {
    this.tag = tag
    this.data = data
    this.children = children
    this.ele = ele
    this.text = text

    this.componentInstance = componentInstance
    this.componentOptions = componentOptions

    // 实例会修改此属性
    this.parent = null
  }
}

// 空 node 用于占位，后续方便 patch
export function createEmptyVNode (text) {
  return new VNode({ text, isComment: true })
}

export function createTextVNode (text) {
  return new VNode({ text })
}
