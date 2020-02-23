export function getAndRemoveAttr (el, name) {
  let val = el.attrsMap[name]
  if (val !== null) {
    const list = el.attrsList
    for (let i = 0, len = list.length; i < len; i++) {
      if (list[i].name === name) {
        list.splice(i, 1)
        break
      }
    }
  }
  return val
}

export function getBindingAttr (el, name, getStatic = true) {
  const dynamicValue = getAndRemoveAttr(el, ':' + name) || getAndRemoveAttr(el, 'v-bind:' + name)
  if (dynamicValue != null) {
    return dynamicValue
  } else if (getStatic) {
    const staticValue = getAndRemoveAttr(el, name)
    if (staticValue != null) {
      return JSON.stringify(staticValue) // 字面量属性非变量，需要 stringify 转换
    }
  }
}

export function addProp (el, name, value) {
  (el.props || (el.props = [])).push({ name, value })
  el.plain = false
}
export function addAttr (el, name, value) {
  (el.attrs || (el.attrs = [])).push({ name, value })
  el.plain = false
}

export function addHandler (el, name, value, modifiers, important) {
  // TODO: 后续再实现修饰符
  let events = el.events = {}

  // 将事件统一转为数组
  if (!events[name]) {
    events[name] = []
  } else if (!Array.isArray(events[name])) {
    events[name] = [events[name]]
  }

  events[name][important ? 'unshift' : 'push']({
    value: value.trim()
  })

  el.plain = false
}
export function addDirective (el, directive) {
  (el.directives || (el.directives = [])).push(directive)
  el.plain = false
}
