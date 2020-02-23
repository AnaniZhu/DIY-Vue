import { isPlainObject } from 'shared/utils'

export function renderList (val, render) {
  let str = ''

  let isObj = isPlainObject(val)

  if (Array.isArray(val) || isObj || typeof val === 'string') {
    Object.keys(val).forEach((key, i) => {
      // 对象迭代时才有第三个参数
      str += isObj ? render(val[key], key, i) : render(val[key], key)
    })
  } else if (typeof val === 'number') {
    for (let i = 0; i < val; i++) {
      str += render(i + 1, i)
    }
  }

  return str
}
