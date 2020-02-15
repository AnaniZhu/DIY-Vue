import Watcher from '../observer/watcher'
import { query } from '../util'
import { isFunction } from '../../shared/utils'

// const lifecycles = [
//   'beforeCreate',
//   'created',
//   'beforeMount',
//   'mounted',
//   'beforeUpdate',
//   'updated',
//   'beforeDestroy',
//   'destroyed'
// ]

export function initLifecycle (vm) {
  // 是否已经挂载的标志位
  vm._isMounted = false
  // 实例的 renderWatcher
  vm._watcher = null
}

export function lifecycleMixin (Vue) {
  // Vue 将 $mount 提取出来放置各个平台文件夹处单独实现，因为不同平台挂载方式不一样
  // 本项目只考虑 web 平台，所以直接在此处实现
  Vue.prototype.$mount = function (el) {
    mountComponent(this, query(el))
  }

  Vue.prototype._update = function (vnode) {
    // 只有在 mounted 之后才会触发 updated 和 beforeUpdated
    this._isMounted && callHook(this, 'beforeUpdate')
    // TODO: patch
    document.querySelector(this.$options.el).innerHTML = vnode
    this._isMounted && callHook(this, 'updated')
  }
}

export function mountComponent (vm, el) {
  if (vm._isMounted) return

  // 挂载元素
  vm.$el = el

  // Vue 源码在此处存在一些性能测量的兼容方法，此处不做实现，只关注核心功能
  const updateComponent = () => {
    vm._update(vm._render())
  }

  callHook(vm, 'beforeMount')
  // eslint-disable-next-line no-new
  new Watcher(vm, updateComponent, null, null, true)
  vm._isMounted = true

  callHook(vm, 'mounted')
}

export function callHook (vm, hook) {
  // TODO: 后续初始化与兼容会在合并策略里处理
  const handlers = []
  const handler = vm.$options[hook]

  isFunction(handler) && handlers.push(handler)

  handlers.forEach(handler => {
    try {
      handler.call(vm)
    } catch (err) {
      console.error(`Error in vm ${hook} hook: ${err}`)
    }
  })
}
