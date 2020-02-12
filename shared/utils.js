export function isObject (obj) {
  return obj !== null && typeof obj === 'object'
}

export function isIteratorObj (obj) {
  const type = Object.prototype.toString.call(obj).slice(8, -1)
  return ['Object', 'Array'].includes(type)
}

export function isPlainObject (obj) {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

export function isFunction (obj) {
  return typeof obj === 'function'
}
