import { renderList } from './render-list'
import { resolveScopedSlots } from './resolve-slots'
import { bindObjectProps } from './bind-object-props'
import { bindObjectListeners } from './bind-object-listeners'

export function installRenderHelpers (prototype) {
  prototype._l = renderList
  prototype._s = toString
  prototype._u = resolveScopedSlots
  prototype._b = bindObjectProps
  prototype._g = bindObjectListeners
}

function toString (val) {
  return val == null
    ? ''
    : typeof val === 'object'
      ? JSON.stringify(val, null, 2)
      : String(val)
}
