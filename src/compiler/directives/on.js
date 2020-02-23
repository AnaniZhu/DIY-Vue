import { warn } from 'core/util'

export default function on (el, dir) {
  const { modifiers, value } = dir
  if (modifiers) {
    // v-on="obj" 的形式是不支持修饰符的
    warn('v-on without argument does not support modifiers.')
  }
  el.wrapListeners = (code) => `_g(${code},${value})`
}
