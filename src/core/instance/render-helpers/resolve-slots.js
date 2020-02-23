export function resolveSlots () {

}

export function resolveScopedSlots (fns) {
  return fns.reduce((obj, fn) => {
    obj[fn.key] = fn.fn
    return obj
  }, {})
}
