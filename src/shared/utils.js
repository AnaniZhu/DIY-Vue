export function isObject (obj) {
  return obj !== null && typeof obj === 'object'
}

export function isIteratorObj (obj) {
  return ['Object', 'Array'].includes(toRawType(obj))
}

export function isPlainObject (obj) {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

export function isFunction (obj) {
  return typeof obj === 'function'
}

export function isPrimitive (value) {
  return ['string', 'number', 'boolean', 'symbol'].includes(value)
}

export function hasOwn (obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

export function noop () {}

export function remove (arr, item) {
  if (arr.length) {
    const index = arr.indexOf(item)
    if (index > -1) {
      return arr.splice(index, 1)
    }
  }
}

export function makeMap (str) {
  let map = str.split(/,\s*/).reduce((map, cur) => {
    map[cur] = true
    return map
  }, {})

  return item => map[item]
}

// 连字符转驼峰
export const camelize = (str) => {
  return str.replace(/-(\w)/g, (_, c) => c ? c.toUpperCase() : '')
}

// 首字母大写
export const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// 驼峰转连字符命名
export const hyphenate = (str) => {
  return str.replace(/\B([A-Z])/g, '-$1').toLowerCase()
}

export function map (obj, cb) {
  if (!isObject(obj)) return
  for (let key in obj) {
    if (hasOwn(obj, key)) {
      cb(key, obj[key])
    }
  }
}

export function toRawType (value) {
  return Object.prototype.toString.call(value).slice(8, -1)
}
