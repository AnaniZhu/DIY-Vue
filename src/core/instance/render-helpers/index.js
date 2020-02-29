import { renderList } from './render-list'
import { resolveScopedSlots } from './resolve-slots'
import { renderSlot } from './render-slot'
import { bindObjectProps } from './bind-object-props'
import { bindObjectListeners } from './bind-object-listeners'
import { createTextVNode } from 'core/vdom/vnode'

export function installRenderHelpers (prototype) {
  prototype._l = renderList
  prototype._s = toString
  prototype._u = resolveScopedSlots
  prototype._b = bindObjectProps
  prototype._g = bindObjectListeners
  prototype._t = renderSlot
  prototype._v = createTextVNode
}

function toString (val) {
  return val == null
    ? ''
    : typeof val === 'object'
      ? JSON.stringify(val, null, 2)
      : String(val)
}
