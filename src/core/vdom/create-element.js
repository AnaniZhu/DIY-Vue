import VNode, { createEmptyVNode, ELEMENT_TYPE } from './vnode'
import { createComponent } from './create-component'
import { isReservedTag } from 'compiler/util'
import { warn, resolveAsset } from '../util'
import { isPrimitive } from 'shared/utils'

export function createElement (context, tag, data, children) {
  // data 参数可能被省略掉，children 参数写到了 data  参数的位置
  // 此处要识别是 children 根本不存在还是说是上面这种情况，如果是上述情况，那么 children 一定是个 vnode 数组或者基本类型
  if (Array.isArray(data) || isPrimitive(data)) {
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
      vnode = new VNode({ tag, data, children, type: ELEMENT_TYPE })
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
