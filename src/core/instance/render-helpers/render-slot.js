
export function renderSlot (slotName, fallback, props, bindObject) {
  // 插槽作用域的优先级比普通插槽高，当两个都存在时，优先渲染插槽作用域
  let nodes
  let scopedSlotFn = this.$scopedSlots[slotName]
  if (scopedSlotFn) {
    props = props || {}
    bindObject = bindObject || {}
    nodes = scopedSlotFn({ ...bindObject, ...props })
  } else {
    nodes = this.$slots[slotName]
  }

  return nodes || fallback
}
