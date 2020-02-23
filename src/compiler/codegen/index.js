import { genHandlers } from './event'
import directives from '../directives'

export function generate (ast) {
  console.log(ast)
  const code = ast ? genElement(ast) : '_c("div")' // _c 是 createElement 函数的别名

  console.log(code)
  return {
    // eslint-disable-next-line no-new-func
    render: new Function(`with(this){return ${code}}`),
    staticRenderFns: []
  }
}

function genElement (el) {
  if (el.if && !el.ifProcessed) {
    return genIf(el)
  } else if (el.for && !el.forProcessed) {
    return genFor(el)
  } else {
    let { tag, component, plain } = el

    if (component) {
      tag = component
    }

    let data
    if (!plain) data = genData(el)
    let children = genChildren(el)

    return `_c('${tag}'${data ? `,${data}` : ''}${children ? `,${children}` : ''})`
  }
}

function genIf (el) {
  el.ifProcessed = true // 标识处理过，防止死循环
  return genIfConditions(el.ifConditions.slice())
}

function genIfConditions (conditions) {
  if (conditions.length === 0) return '""'
  let { exp, block } = conditions.shift()

  return exp ? `${exp}?${genElement(block)}:${genIfConditions(conditions)}` : genElement(block)
}

function genFor (el) {
  el.forProcessed = true

  const { for: exp, alias, iterator1, iterator2 } = el

  let args = [alias]
  if (iterator1) args.push(iterator1)
  if (iterator2) args.push(iterator2)

  // _l 是 renderList 的别名, instance/render-helpers 中定义
  return `_l(${exp}, function(${args.join(',')}){return ${genElement(el)}})`
}

// 生成一个 data 的对象字符串, 把里面的属性都适配成 render 函数中所需的字段
function genData (el) {
  let data = '{'

  // directive
  // 指令必须最早初始化，里面会修改一些属性，会影响后续属性的生成
  const dirs = genDirectives(el)
  if (dirs) data += dirs + ','

  // key
  if (el.key) {
    data += `key:${el.key},`
  }
  // ref
  if (el.ref) {
    data += `ref:${el.ref},`
  }
  if (el.refInFor) {
    data += 'refInFor:true,'
  }
  // attributes
  if (el.attrs) {
    data += `attrs:${genProps(el.attrs)},`
  }
  // DOM props
  if (el.props) {
    data += `domProps:${genProps(el.props)},`
  }
  // event handlers
  if (el.events) {
    data += `on:${genHandlers(el.events)},`
  }

  // TODO: 后续再实现事件修饰符
  // if (el.nativeEvents) {
  //   data += `nativeOn:${genHandlers(el.nativeEvents)},`
  // }

  // slot target
  // only for non-scoped slots
  if (el.slotTarget && !el.slotScope) {
    data += `slot:${el.slotTarget},`
  }
  // scoped slots
  if (el.scopedSlots) {
    data += `scopedSlots:${genScopedSlots(el.scopedSlots)},`
  }

  data = data.replace(/,$/, '') + '}'

  // v-bind="xx" 代码注入
  el.wrapData && el.wrapData(data)

  // v-on="xxx" 代码注入
  el.wrapListeners && el.wrapListeners(data)

  return data
}

function genDirectives (el) {
  let dirs = el.directives
  if (!dirs) return

  let res = 'directives:['
  res += dirs.map(dir => {
    const { name, value, arg, modifiers } = dir

    // 预设指令注入
    if (name in directives) {
      directives[name](el, dir)
    }

    return `{name:"${name}"${
      value ? `,value:(${value}),expression:${JSON.stringify(value)}` : ''
    }${
      arg ? `,arg:"${arg}"` : ''
    }${
      modifiers ? `,modifiers:${JSON.stringify(modifiers)}` : ''
    }}`
  }).join(',')
  return res + ']'
}

function genProps (props) {
  return props.reduce((str, { name, value }) => (str += `"${name}":${value},`), '{').slice(0, -1) + '}'
}

function genScopedSlots (slots) {
  // _u 是 resolveScopedSlots 的别名, instance/render-helpers 中定义
  return `_u([${
    Object.keys(slots).map(key => genScopedSlot(key, slots[key])).join(',')
  }])`
}

function genScopedSlot (key, el) {
  let fn = `function(${String(el.slotScope)}){return ${el.tag === 'template' ? genChildren(el) : genElement(el)}}`
  return `{key:${key},fn:${fn}}`
}

function genChildren (el) {
  const { children } = el
  if (children && children.length) return `[${children.map(child => genNode(child)).join(',')}]`
}

function genNode (el) {
  return (el.type === Node.ELEMENT_NODE ? genElement : genText)(el)
}

function genText (el) {
  const { type, expression, text } = el
  // debugger
  return type === Node.TEXT_NODE ? JSON.stringify(text) : expression
}
