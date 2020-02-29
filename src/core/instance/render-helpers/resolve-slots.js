export function resolveSlots (children) {
  return children
    ? children.reduce((slots, child) => {
      const { data } = child

      if (data && data.attrs && data.attrs.slot) {
        delete data.attrs.slot
      }

      const name = data ? data.slot : 'default'
      const slot = (slots[name] || (slots[name] = []))

      if (child.tag === 'template') {
        slot.push.apply(slot, child.children || [])
      } else {
        slot.push(child)
      }

      return slots
    }, {})
    : {}
}

export function resolveScopedSlots (fns) {
  return fns.reduce((obj, fn) => {
    obj[fn.key] = fn.fn
    return obj
  }, {})
}
