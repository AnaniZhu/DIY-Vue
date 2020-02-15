import { observe } from './index'

const methods = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

export const proxyArrayProto = Object.create(Array.prototype)

methods.forEach(method => {
  proxyArrayProto[method] = function () {
    const result = Array.prototype[method].apply(this, arguments)
    let args
    switch (method) {
      case 'push':
      case 'unshift':
        args = Array.from(arguments)
        break
      case 'splice':
        args = Array.from(arguments).slice(2)
        break
    }
    args && args.forEach(observe)
    this.__ob__.dep.notify()
    return result
  }
})
