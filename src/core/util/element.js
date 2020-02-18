
import { warn } from './debug'

export function query (el) {
  if (typeof el === 'string') {
    el = document.querySelector(el)
    if (el) {
      return el
    } else {
      warn(`Cannot find element: ${el}`)
      return document.createElement('div')
    }
  } else {
    return el
  }
}
