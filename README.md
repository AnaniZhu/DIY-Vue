# DIY-Vue

> 自己动手实现一个简单版的 [Vue](https://github.com/vuejs/vue), 深度掌握 `Vue` 的实现原理，学习 `Vue` 的设计思想。
>
> 先按照自己思路写，再跟 `Vue` 源码做对比，通过对比揣摩 `Vue` 的实现思路, 进而优化自身代码，并考虑 `Vue` 源码是否可以进一步优化？
>
> 本项目仅考虑 web 端的实现，且不做浏览器兼容处理，性能优化上也不会追求极致，专注于实现其核心功能。
>
> 具体实现代码的属性名、方法名尽量会跟 `Vue` 官方源码保持一致，部分实现可能会有偏差。
>
> 本仓库代码内有比较详细的注释解释其实现思路。

## TODOLIST

- [x] observer
  - [x] observe
  - [x] dep
  - [x] watcher
  - [x] array
  - [x] scheduler
- [ ] instance
  - [x] init
  - [x] lifecycle (生命周期还存在部分问题，`beforeDestroy` 和 `destroyed` 还未实现)
  - [ ] event
  - [x] render
  - [x] state
  - [ ] inject
- [ ] complier
  - [x] parser
  - [x] codegen
  - [ ] directive
    - [x] `v-if` & `v-else` & `v-else-if`
    - [x] `v-for`
    - [x] `v-bind`
    - [ ] `v-on`
    - [x] `v-model` （目前只实现了最简单的 `input` 绑定）
    - [ ] `v-html`
    - [ ] `v-text`
    - [ ] `v-show`
    - [ ] `v-pre`
    - [ ] `v-once`
    - [ ] `v-cloak`
    - [ ] `v-slot`
  - [x] `Mustache` 文本插值
  - [ ] `filter`
  - [ ] `class` 和 `style` 数据格式（数组、对象）兼容
- [ ] vdom
  - [x] vnode
  - [x] patch (指令以及组件的销毁操作还未完成)
  - [x] create-element
  - [x] create-component
  - [ ] create-functional-component
- [ ] component
  - [x] `template` (目前只实现常用功能, 可用指令及属性如上)
  - [x] `props`
  - [x] `computed`
  - [x] `watch`
  - [x] `methods`
  - [x] `slots` & `scopedSlots`
  - [ ] 自定义事件
  - [ ] `mixin`
  - [ ] 生命周期
  - [ ] 函数式组件
  - [ ] 异步组件
  - [ ] `keep-alive`
  - [ ] `transition`
- [ ] `Vue.extend`