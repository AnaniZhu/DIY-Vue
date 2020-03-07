
export function renderSlot (slotName, fallback, props, bindObject) {
  // 插槽作用域的优先级比普通插槽高，当两个都存在时，优先渲染插槽作用域
  let scopedSlotFn = this.$scopedSlots[slotName]
  let nodes = scopedSlotFn ? scopedSlotFn({ ...(bindObject || {}), ...(props || {}) }) : this.$slots[slotName]

  return nodes || fallback
}
