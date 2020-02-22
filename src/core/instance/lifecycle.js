import Watcher from '../observer/watcher'
import { compiler } from 'compiler'

import { query, warn } from '../util'
import { isFunction } from 'shared/utils'

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
  // 本项目实现的是可编译版本，支持编译 template
  Vue.prototype.$mount = function (el) {
    // init 里面虽然做了 el 的非空判断，但可能存在如下使用情况:
    // vm = new Vue({}); vm.$mount(); 此时 $mount 可能没传入 el
    el = el && query(el)

    // <body></body> 和 <html></html> 不允许被挂载
    if (el === document.body || el === document.documentElement) {
      warn('Do not mount Vue to <html> or <body> - mount to normal elements instead.')
      return this
    }

    let { template, render } = this.$options

    // 优先级: render > template > el
    if (!render) {
      /**
     * template 可能存在以下几种格式:
     * 字符串 - id 选择器
     * 字符串 - vue 模板
     * DOM 节点
     */
      if (template) {
        if (typeof template === 'string') {
          if (template.charAt(0) === '#') {
            template = query(el).innerHTML // Vue 源码在此处做了缓存，避免重复查找 dom, 本实现暂不考虑

            !template && warn(`Template element not found or is empty: ${template}`, this)
          }
        } else if (template.nodeType === Node.ELEMENT_NODE) { // Vue 源码直接判断是否是 node 节点，只不过非元素节点的 innerHTML 肯定是 undefined
          template = template.innerHTML
        } else {
          warn('invalid template option:' + template, this)
        }
      } else {
        template = el && el.outerHTML
      }
    }

    if (template) {
      const { render } = compiler(template)
      this.$options.render = render
    }

    mountComponent(this, query(el))
  }

  Vue.prototype._update = function (vnode) {
    // 只有在 mounted 之后才会触发 updated 和 beforeUpdated
    this._isMounted && callHook(this, 'beforeUpdate')
    // TODO: patch
    // document.querySelector(this.$options.el).innerHTML = vnode
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
      warn(`Error in vm ${hook} hook: ${err}`, vm)
    }
  })
}
