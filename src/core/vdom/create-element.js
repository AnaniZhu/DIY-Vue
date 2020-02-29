import VNode, { createEmptyVNode } from './vnode'
import { createComponent } from './create-component'
import { isReservedTag } from 'compiler/util'
import { warn, resolveAsset } from '../util'

export function createElement (context, tag, data, children) {
  if (!children) {
    children = data
    data = undefined
  }

  // 处理 <Component is="xxx" /> 的情况，组件名才是最终的 tag
  // 这里可能是个字符串(在 components option 中注册)，也可能直接是一个组件对象
  if (data && data.is) {
    tag = data.is
  }

  if (!tag) return createEmptyVNode()

  if (children) {
    if (Array.isArray(children)) {
      // 当子元素含有 slot 时，slot 可能有包含多个子元素，就变成嵌套数组，此处拍平
      // 同时可能父组件为传递该 slot，并且这个 slot 也没有默认占位元素，renderSlot 就会返回空，此处过滤掉
      children = children.flat(1).filter(child => child)
    } else {
      // 用户写 render 时，children 可能不一定是个数组，可能是单一的元素，此处统一转为数组
      children = [children]
    }
  }
  let vnode
  if (typeof tag === 'string') {
    let { components } = context.$options
    let componentOptions

    // 处理普通文本标签
    if (isReservedTag(tag)) {
      vnode = new VNode({ tag, data, children })
    } else if (components && (componentOptions = resolveAsset(components, tag))) { // 处理组件名(在 components 里注册过的组件)
      vnode = createComponent(componentOptions, data, children)
    } else {
      warn(`Error in render: 组件 <${tag}> 未注册`)
    }
  } else { // 处理组件对象的情况
    vnode = createComponent(tag, data, children)
  }

  return vnode || createEmptyVNode()
}
