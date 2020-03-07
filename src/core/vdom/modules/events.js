import { map, hasOwn, remove } from 'shared/utils'

export function updateEvents (oldValue, value, el) {
  if (oldValue) {
    oldValue = { ...oldValue }
  }

  value && map(value, (name, handlers) => {
    let clonedHandler
    // 浅克隆，防止后面直接修改引用对象
    if (oldValue && hasOwn(oldValue, name)) {
      clonedHandler = [...oldValue[name]]
    }

    handlers.forEach(handler => {
      if (clonedHandler && clonedHandler.includes(handler)) {
        remove(clonedHandler, handler)
      } else {
        el.addEventListener(name, handler)
      }
    })

    if (clonedHandler) {
      oldValue[name] = clonedHandler
    }
  })

  // 删除旧的事件监听器
  oldValue && map(oldValue, (name, handlers) => {
    handlers.forEach(handler => {
      el.removeEventListener(name, handler)
    })
  })
}
