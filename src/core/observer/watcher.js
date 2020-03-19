import { pushTarget, popTarget } from './dep'
import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import { isObject, remove } from 'shared/utils'

let id = 0
export default class Watcher {
  constructor (
    vm,
    expOrFn,
    cb,
    options,
    isRenderWatcher
  ) {
    // update 需要根据 id 排序，从而保证正确焕然
    this.id = ++id
    this.vm = vm

    if (isRenderWatcher) vm._watcher = this

    // 将实例的所有 watchers 存储下来，当 vm 卸载时方便清除
    // 此属性在 state.js 的 initState 中初始化
    vm._watchers.push(this)

    this.cb = cb
    // 存放此 watcher getter 内所有依赖的响应式属性所对应的 dep
    this.deps = []
    this.depsIdSet = new Set()
    this.newDepsIdSet = new Set()
    this.expression = expOrFn.toString()
    if (options) {
      const { deep, lazy, immediate } = options
      this.deep = deep
      // dirty 用来表示 Computed 所依赖的值是否发生改变，如果 dirty 为 true，该 computed 被访问时，getter 会被重新调用
      this.dirty = this.lazy = lazy
      this.immediate = immediate
    }
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = function () {
        try {
          return expOrFn.split('.').reduce((val, key) => val[key], this)
        } catch (e) {}
      }
    }

    this.value = this.lazy ? undefined : this.get()

    this.immediate && this.cb && this.cb.call(this.vm, this.value)
  }

  get () {
    pushTarget(this)
    const val = this.getter.call(this.vm)
    this.deep && traverse(val)
    popTarget()
    this.cleanupDeps()
    return val
  }

  run () {
    const oldVal = this.value
    this.value = this.get()

    /**
     * 值相同的可能性
     * - 父层级值发生变化，子层级的值可能依旧相同
     * - 给被监听的对象添加了新属性，对象是引用类型，改对象属性后，oldVal 和 this.value 依旧相等（引用地址未变）
     */
    if (
      oldVal !== this.value ||
      isObject(this.value) // 对象新增属性，此对象也相当于改变
    ) {
      this.cb && this.cb.call(this.vm, this.value, oldVal)
    }
  }

  update () {
    if (this.lazy) {
      this.dirty = true
      return
    }

    queueWatcher(this)
  }

  // 用于 lazy watcher ( Computed ) 重新触发 getter
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * 为什么不内部独立维护一个 this.dep，然后 update时 主动调用 this.dep.notify() 进行通知 ?
   * 可能存在一个响应属性被多个 watcher getter 所依赖 （比如 computed），
   * 而多个 watcher 可能又同时被另一个 watcher 所依赖（比如 renderWatcher）,
   * 此响应式属性修改后，多个 watcher update 时进行 notify 自身的 dep watcher，就会重复通知到同一个 watcher, 导致该 watcher 重复执行。
   *
   * 假设如下场景:
   * 两个 computed 同时依赖一个 data 里的 num 属性，且这两个 computed 在 render 中被使用。
   * 如果内部维护 this.dep, 两个 computed (lazy watcher) 都会收集到 renderWatcher,
   * 然后 num 发生改变，两个 computed 触发 update, 都执行 this.notify() 通知 renderWatcher，导致 renderWatcher 重复执行
   */
  addDep (dep) {
    // Vue 源码中这段代码没有直接将 dep 添加到 deps 和 depsIdSet,
    // 而是在 cleanupDeps 中直接把 this.newDeps 赋值给 this.deps，而且后续遍历 this.deps 将自身从 dep 中移除也更快，因为 this.deps 长度没有增加

    // 我的实现
    const id = dep.id
    if (!this.newDepsIdSet.has(id)) {
      this.newDepsIdSet.add(id)
      // 多次触发 getter 会重复收集 dep, 此处做重复判断
      if (!this.depsIdSet.has(id)) {
        this.deps.push(dep)
        this.depsIdSet.add(id)
        dep.addSub(this)
      }
    }

    // Vue 中的实现
    // const id = dep.id
    // if (!this.newDepIds.has(id)) {
    //   this.newDepIds.add(id)
    //   this.newDeps.push(dep)
    //   if (!this.depIds.has(id)) {
    //     dep.addSub(this)
    //   }
    // }
  }

  /**
   * Vue 源码这段代码比较复杂难以阅读，目的是为了一点性能提升
   * 直接把 getter 中收集到的 newDeps 赋值给 this.deps，省的 this.deps.splice 逐个删除, splice 本质上是遍历查找后删除，比较慢
   * 然后把老的 this.deps 赋值给 this.newsDeps, 只是为了复用引用地址，然后将旧的 deps 数组清空： this.deps.length = 0
   * depsIdSet 和 newDepsIdSet 同理。
   */

  // 新老 deps 比较, 删除不需要的 dep, 防止不再依赖的属性改变从而触发 watcher update
  /**
   * 假设 template 是如下结构, 且 flag, num1 和 num2 都是响应式属性
   * template: <div><span v-if="flag">{{num1}}</span><span>{{num2}}</span></div>
   * 一开始 flag 为 true，渲染 num1，同时 num1 修改会触发重新 render
   * 此时将 flag 置为 false, 此时不应该再关心 num1 的改变，num1 的修改不应该触发 render, 所有需要将 num1 从依赖中移除
   * 这也是 cleanupDeps 的作用
   */
  cleanupDeps () {
    // 从后往前遍历，删除对应下标时，不会导致遍历出错

    // 我的实现
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepsIdSet.has(dep.id)) {
        dep.removeSub(this)
        this.deps.splice(i, 1)
        this.depsIdSet.delete(dep.id)
      }
    }

    this.newDepsIdSet.clear()

    // Vue 中的实现
    // let i = this.deps.length
    // while (i--) {
    //   const dep = this.deps[i]
    //   if (!this.newDepIds.has(dep.id)) {
    //     dep.removeSub(this)
    //   }
    // }
    // let tmp = this.depIds
    // this.depIds = this.newDepIds
    // this.newDepIds = tmp
    // this.newDepIds.clear()
    // tmp = this.deps
    // this.deps = this.newDeps
    // this.newDeps = tmp
    // this.newDeps.length = 0
  }

  // 当一个 watcher 依赖另一个 watcher 时，另一个 watcher 的 deps 也需要收集此 watcher
  // 发生在多层 watcher 嵌套引用时
  depend () {
    this.deps.forEach(dep => dep.depend())
  }

  teardown () {
    this.deps.forEach(dep => dep.removeSub(this))
    remove(this.vm._watchers, this)
  }
}
