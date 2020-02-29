import { isObject } from 'shared/utils'
import { warn } from '../../util'
import { mustUseProp, isReservedAttribute } from 'compiler/util'

export function bindObjectProps (data, tag, value, asProp) {
  if (value) {
    if (!isObject(value)) {
      warn('v-bind without argument expects an Object or Array value', this)
    } else {
      let hash
      for (const key in value) {
        if (key === 'class' || key === 'style' || isReservedAttribute(key)) {
          hash = data
        } else {
          const type = data.attrs && data.attrs.type
          hash = asProp || mustUseProp(tag, type, key)
            ? data.domProps || (data.domProps = {})
            : data.attrs || (data.attrs = {})
        }
        if (!(key in hash)) {
          hash[key] = value[key]
        }
      }
    }
  }
  return data
}
