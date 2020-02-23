import { warn } from '../../util'
import { isPlainObject } from 'shared/utils'

export function bindObjectListeners (data, value) {
  if (value) {
    if (!isPlainObject(value)) {
      warn('v-on without argument expects an Object value', this)
    } else {
      // 浅克隆一份，防止用户传入引用值被修改
      const on = data.on = data.on ? { ...data.on } : {}
      for (const key in value) {
        const existing = on[key]
        const ours = value[key]
        // 事件已存在则合并为数组
        on[key] = existing ? [].concat(existing, ours) : ours
      }
    }
  }
  return data
}
