export default function bind (el, dir) {
  const { modifiers, value } = dir
  el.wrapData = function (code) {
    return `_b(${code},${el.tag},${value},${!!(modifiers && modifiers.prop)})`
  }
}
