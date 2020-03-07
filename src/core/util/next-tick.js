
import { warn } from './debug'

const cbs = []

let taskFn
let pending = false

/**
 * 根据兼容性选出 nextTick 的异步方法
 * Vue 在此处判断了多种方式:
 * 宏任务: setImmediate, MessageChannel, setTimeout
 * 微任务: Promise
 *
 * 此处实现进行简化
 */
if (window.Promise) {
  taskFn = cb => Promise.resolve().then(cb)
} else {
  taskFn = cb => setTimeout(cb)
}

export function nextTick (cb, ctx) {
  let _resolve

  cbs.push(() => {
    if (cb) {
      try {
        cb.call(ctx)
      } catch (e) {
        warn(`error in nextTick: ${e}`)
      }
    } else if (_resolve) {
      // 返回的 promise 第一个参数为 vm
      _resolve(ctx)
    }
  })

  if (!pending) {
    pending = true
    taskFn(() => {
      pending = false
      cbs.forEach(cb => cb())
      cbs.length = 0
    })
  }

  // 当 nextTick 没有传入回调时，需要返回一个 promise
  if (!cb && window.Promise) {
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}
