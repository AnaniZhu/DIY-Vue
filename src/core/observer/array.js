import { observe, defineReactive } from './index'

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
    // 储存数组方法执行之前的长度
    let oldLen = this.length
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

    if (args && args.length) {
      args.forEach(observe)

      // 因为本项目实现是对数组下标进行响应式监听的，当新增元素后，需对新的下标进行监听
      // 删除元素不用考虑, 多余的下标会自动解除 get set, 因为无法触发 get，其依赖在 watcher cleanDeps 中清除
      if (this.length > oldLen) {
        for (let i = oldLen; i < this.length; i++) {
          defineReactive(this, i)
        }
      }
    }

    this.__ob__.dep.notify()

    return result
  }
})
