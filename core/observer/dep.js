import { remove } from '../../shared/utils'

let id = 0

export default class Dep {
  constructor () {
    this.id = ++id
    this.subs = []
  }

  addSub (sub) {
    sub && this.subs.indexOf(sub) === -1 && this.subs.push(sub)
  }

  removeSub (sub) {
    remove(this.subs, sub)
  }

  depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
    // let i = targetStack.length
    // while (i--) {
    //   this.addSub(targetStack[i])
    // }
  }

  notify () {
    // 通知 update 时要先将 watchers 排序，保证 watchers 按顺序正确执行
    const subs = this.subs.slice()
    subs.sort((a, b) => a.id - b.id)
    subs.forEach(sub => sub.update())
  }
}

// 指向当前正要被收集为依赖的 watcher
Dep.target = null
// watcher 可能会嵌套依赖，用栈来维护这些 watchers
// 比如 computed 就是一个 lazy watcher, renderWatcher 依赖 computed,
// computed 可能会依赖另一个 computed，另一个 computed 可能继续依赖其他 computed，以此类推...
const targetStack = []
export function pushTarget (target) {
  Dep.target && targetStack.push(Dep.target)
  Dep.target = target
}
export function popTarget () {
  Dep.target = targetStack.pop()
}
