import { warn } from 'compiler/util'
import { addProp, addHandler } from '../helper'

export default function model (el, dir) {
  // TODO: 目前只实现普通的 input，后续添加其他的
  if (el.tag === 'input') {
    // 属性冲突报错
    let value, attr
    if ((value = el.attrsMap['v-bind:value'])) {
      attr = 'v-bind:value'
    } else if ((value = el.attrsMap[':value'])) {
      attr = ':value'
    }
    value && warn(`元素上 ${attr}=${value} 属性与 v-model 冲突`)

    value = dir.value
    // Vue 在此处处理了很多兼容情况，以及如果绑定的属性不存在时，会调用 $set 添加
    const handler = `function(e){${value}=e.target.value}`

    addProp(el, 'value', `(${value})`)
    addHandler(el, 'input', handler, null, true)

    // const value = el.attrsMap['v-bind:value'] || el.attrsMap[':value']
  }
}
