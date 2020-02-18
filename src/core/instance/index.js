import { initMixin } from './init'
import { stateMixin } from './state'
import { lifecycleMixin } from './lifecycle'
import { renderMixin } from './render'
import { warn } from '../util'

export default function Vue (options) {
  if (this instanceof Vue) {
    this._init(options)
  } else {
    // 防止 Vue 函数直接调用
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
}

// 此处都是混入一些属性和方法，不存在调用，以下顺序可随意调换
initMixin(Vue)
stateMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)
