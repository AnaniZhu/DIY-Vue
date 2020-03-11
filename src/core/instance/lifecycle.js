import Watcher from '../observer/watcher'
import { compiler } from 'compiler'
import { resolveSlots } from './render-helpers/resolve-slots'

import { query, warn, validateProp } from '../util'
import { isFunction, map } from 'shared/utils'

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

/**
 * 这个变量用来标识当前处于更新中的组件实例
 * 可以通过这个变量来构建组件实例中的父子关系，$parent, $children 的关系就靠这个变量来实现
 * Vue 源码中 scoped-style & transition 组件也跟这个变量有关系
 */
export let activeInstance = null

export function initLifecycle (vm) {
  // 是否已经挂载的标志位
  vm._isMounted = false
  // 实例的 renderWatcher
  vm._watcher = null

  let { parent } = vm.$options

  vm.$root = parent ? parent.$root : vm
  vm.$parent = parent
  vm.$children = []

  parent && parent.$children.push(vm)
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
            template = query(template).innerHTML // Vue 源码在此处做了缓存，避免重复查找 dom, 本实现暂不考虑

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

    mountComponent(this, el)
  }

  Vue.prototype._update = function (vnode) {
    // 只有在 mounted 之后才会触发 updated 和 beforeUpdated
    this._isMounted && callHook(this, 'beforeUpdate')

    const prevVnode = this._vnode
    this._vnode = vnode

    let prevActiveInstance = activeInstance
    activeInstance = this
    this.__patch__(prevVnode, vnode, this.$el)
    activeInstance = prevActiveInstance

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

export function updateChildComponent (oldVnode, vnode) {
  const {
    data,
    componentInstance: vm,
    componentOptions: { propsData, listeners, children }
  } = vnode

  const { data: oldData } = oldVnode

  // 新老 vnode 只要还有 slots 和 scopedSlots 都认为含有子元素
  // 包括老 vnode 有 slots 或 scopedSlot，新 vnode 没有的情况
  const hasChildren = !!(children || oldVnode.children || data.scopedSlots || oldData.$scopedSlots)

  // 更新组件 props 数据
  vm.$options.propsData = propsData
  /**
   * Q: 为什么不遍历 propsData ?
   * A: 可能存在 <Child v-bind="props"></Child> 的情况，绑定的 props 对象可能会删除一些 key，这种情况需要将值清空
   */
  map(vm.$options.props, key => {
    if (propsData[key] !== vm._props[key]) {
      vm._props[key] = validateProp(key, vm)
    }
  })

  // TODO: 组件事件还未实现，后续需要 patch 组件事件

  // 更新子组件属性

  vm.$listeners = listeners || {}
  vm.$attrs = data ? data.attrs : {}
  vm.$scopedSlots = data.scopedSlots || {}
  vm.$slots = resolveSlots(children)

  // 只要含有 slots 或 scopedSlots，父组件更新时也要强制触发子组件的更新
  // 因为 slots, scopedSlots 可能发生改变，而 vnode 上 children/scopedSlots 全是新对象
  // 如果要比对只能递归遍历逐一判断，性能消耗太大，所以一视同仁，只要含有子元素就必须要更新
  // 是否可以优化？
  if (hasChildren) {
    vm.$forceUpdate()
  }
}
