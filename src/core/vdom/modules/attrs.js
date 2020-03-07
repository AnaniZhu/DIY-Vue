import { map, hasOwn } from 'shared/utils'

export function updateAttrs (oldValue, value, el) {
  if (oldValue) {
    oldValue = { ...oldValue }
  }

  value && map(value, (key, val) => {
    if (!oldValue || oldValue[key] !== val) {
      el.setAttribute(key, val)
    }

    if (oldValue && hasOwn(oldValue, key)) {
      delete oldValue[key]
    }
  })

  // 删除多余的属性
  oldValue && map(oldValue, (key, val) => {
    el.removeAttribute(key)
  })
}
