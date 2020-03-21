import { parseHTML } from './html-parser'
import { parseText } from './text-parser'
import { warn, mustUseProp } from '../util'
import { getAndRemoveAttr, getBindingAttr, addProp, addAttr, addHandler, addDirective } from '../helper'
import { camelize } from 'shared/utils'

const forAliasRE = /(?<args>[\s\S]*?)\s+(?:in|of)\s+(?<for>\w+)/
const forIteratorRE = /,(?<iterator1>[^,}\]]*)(?:,(?<iterator2>[^,}\]]*))?$/
const stripParensRE = /^\(|\)$/g

const argRE = /:(.*)$/
const dirRE = /^v-|^@|^:/
const bindRE = /^:|^v-bind:/
const onRE = /^@|^v-on:/
const modifierRE = /\.[^.]+/g

export function parse (template) {
  let stack = []
  let root
  let currentParent
  let warned = false

  const warnOnce = (msg) => {
    if (!warned) {
      warned = true
      warn(msg)
    }
  }

  parseHTML(template, {
    start (tagName, attrs, isUnary) {
      const element = {
        type: Node.ELEMENT_NODE,
        tag: tagName,
        attrsList: attrs,
        attrsMap: makeAttrsMap(attrs),
        parent: currentParent,
        children: []
      }

      processFor(element)
      processIf(element, root)
      processElement(element)

      if (!root) {
        root = element
      } else if (stack.length === 0 && !(root.if && element.exclude)) {
        // 唯一根节点的判断一定要在 processIf 后面。
        // 如果根节点有多个，但是含有 v-if, 以及 v-else(-if) 等属性，最终只会产生一个根节点
        warnOnce('template 只允许含有一个根节点')
        return
      }

      /**
       * 以下情况不能将本元素添加到父元素的 children 中
       * 1. 当前标签元素含有 v-else(-if)，有 v-else(-if) 会通过 exclude 标识
       * - v-if 以及 v-else(-if) 最终产生的只会是一个子元素
       * - 所以只需将 v-if 的元素添加到父元素中，其余 v-else(-if) 元素全都加到 v-if 元素的 ifConditions 里
       * 2. 当前标签元素含有 slot-scope 属性，有 slot-scope 会通过 slotScope 标识
       * - 如果当前标签存在 slot-scope， 则该标签元素一定是个插槽，就不放入 children 中了
       */
      if (currentParent && !element.exclude && !element.slotScope) {
        currentParent.children.push(element)
      }

      // 如果当前是非闭合标签，就不入栈了
      if (!isUnary) {
        currentParent = element
        stack.push(element)
      }
    },
    end () {
      stack.pop()
      currentParent = stack[stack.length - 1]
    },
    char (text) {
      // 空白文本直接忽略
      if (currentParent && text.trim()) {
        // 此处检查是普通纯文本，还是包含动态属性的文本，eg: {{name}}
        let res = parseText(text)
        if (res) {
          currentParent.children.push({
            type: Node.ATTRIBUTE_NODE,
            expression: res.expression,
            tokens: res.tokens,
            text
          })
        } else {
          currentParent.children.push({
            type: Node.TEXT_NODE,
            text
          })
        }
      } else {
        /**
         * 当 currentParent 时元素栈内为空，存在如下两种场景:
         * 1. 整个模板都是文本，不存在标签
         * 2. 模板开头或结尾可能存在文本与根元素同级
         */
        if (text === template) {
          warn('template 至少需要一个根元素节点，不能全是文本')
        } else if (text.trim()) { // 如果开头结尾都是空格换行则忽略
          warnOnce(`文本 ${text} 在根元素之外，将会被忽略`)
        }
      }
    }
  })

  return root
}

function makeAttrsMap (attrs) {
  return attrs.reduce((map, { name, value }) => {
    map[name] = value
    return map
  }, {})
}

function processFor (el) {
  let vFor = getAndRemoveAttr(el, 'v-for')
  if (vFor != null) {
    let matched = vFor.match(forAliasRE)
    if (matched) {
      let { args, for: elFor } = matched.groups
      // for 为迭代目标
      el.for = elFor
      // 迭代参数可能有小括号包裹，去掉该括号
      let alias = args.replace(stripParensRE, '')
      if ((matched = alias.match(forIteratorRE))) {
        el.alias = alias.replace(matched[0], '')
        // 迭代 key
        if (matched.groups.iterator1) {
          el.iterator1 = matched.groups.iterator1.trim()
        }
        // 迭代的下标
        if (matched.groups.iterator2) {
          el.iterator2 = matched.groups.iterator2.trim()
        }
      } else {
        el.alias = alias
      }
    } else {
      warn(`invalid expression in Element ${el.tag} v-for: ${vFor}`)
    }
  }
}

function processIf (el, root) {
  const { parent } = el
  let exp
  if ((exp = getAndRemoveAttr(el, 'v-if'))) {
    el.if = exp
    addIfConditions(el, { exp, block: el })
  } else if ((exp = getAndRemoveAttr(el, 'v-else-if'))) {
    el.exclude = true
  } else if (getAndRemoveAttr(el, 'v-else') != null) {
    el.exclude = true
    exp = undefined
  }

  if (el.exclude) {
    if (parent) {
      // 找到该元素之前含有 v-if 的兄弟元素
      const target = findPrevElement(parent.children)
      if (target.if) {
        el.exclude = true
        addIfConditions(target, { exp, block: el })
      }
    } else if (root && root.if) { // 父元素不存时，则当前元素为根元素且含有 v-else-if | v-else
      el.exclude = true
      addIfConditions(root, { exp, block: el })
    }
  }
}

function processElement (el) {
  processKey(el)

  el.plain = !el.key && !el.attrsList.length

  processRef(el)
  processSlot(el)
  processComponent(el)
  processAttrs(el)
}

function processKey (el) {
  let key = getAndRemoveAttr(el, 'key')
  if (key) {
    if (el.tag === 'template') {
      warn('<template> cannot be keyed. Place the key on real elements instead.')
    }
    el.key = key
  }
}

function processRef (el) {
  let ref = getBindingAttr(el, 'ref')
  if (ref) {
    el.ref = ref
    // 如果当前元素存在 ref 且在 for 循环之中，ref 应该为数组格式，此处给个属性 refInFor 做标识
    el.refInFor = checkInFor(el)
  }
}

function processSlot (el) {
  if (el.tag === 'slot') {
    el.slotName = getBindingAttr(el, 'name')
  } else {
    let slotScope

    if ((slotScope = getAndRemoveAttr(el, 'slot-scope'))) {
      el.slotScope = slotScope
    }
    // 没有 slot 属性则是默认插槽
    const slotTarget = getBindingAttr(el, 'slot')

    const defaultName = '"default"'

    if (slotTarget != null) {
      el.slotTarget = slotTarget || defaultName
    }

    if (slotScope && el.parent) {
      el.parent.plain = false
      ;(el.parent.scopedSlots || (el.parent.scopedSlots = {}))[el.slotTarget || defaultName] = el
    }

    // Vue 在此处做了 shadow dom 的处理，本实现忽略
  }
}

function processComponent (el) {
  let is = getBindingAttr(el, 'is')
  if (is) {
    el.component = is
  }
  // Vue 在此处做了 inline-template 的处理，本实现忽略
}

function processAttrs (el) {
  let modifiers, isProp
  el.attrsList.forEach(({ name, value }) => {
    if (dirRE.test(name)) {
      // 标识此元素是否包含指令
      el.hasBindings = true

      // 处理修饰符
      modifiers = parseModifiers(name)
      if (modifiers) {
        name = name.replace(modifierRE, '')
      }

      // v-bind 或者 : 指令
      if (bindRE.test(name)) {
        name = name.replace(bindRE, '')

        if (!value.trim()) {
          warn(`The value for a v-bind expression cannot be empty. Found in "v-bind:${name}"`)
        }

        if (modifiers) {
          if (modifiers.prop) {
            isProp = true
            name = camelize(name)
            if (name === 'innerHtml') name = 'innerHTML'
          }
          if (modifiers.camel) {
            name = camelize(name)
          }
          if (modifiers.sync) {
            // addHandler(el, name, value)
          }
        }

        // 部分属性必须要通过 prop 形式直接加在元素上, 此处把普通属性和 prop 分开
        if (isProp || (!el.component && mustUseProp(el.tag, el.attrsMap.type, name))) {
          addProp(el, name, value)
        } else {
          addAttr(el, name, value)
        }
      } else if (onRE.test(name)) { // v-on 或者 @ 指令
        name = name.replace(onRE, '')
        addHandler(el, name, value)
      } else { // 正常的指令
        name = name.replace(dirRE, '')

        // 指令可能存在这种形式: v-demo:foo, 此处把冒号之后的截掉
        const argMatch = name.match(argRE)
        const arg = argMatch && argMatch[1]
        if (arg) {
          name = name.slice(0, -(arg.length + 1))
        }

        addDirective(el, { name, value, arg, modifiers })
      }
    } else { // 此处都是字面量属性，非变量
      addAttr(el, name, JSON.stringify(value))
    }
  })
}

function findPrevElement (children) {
  for (let len = children.length, i = len - 1; i > 0; i--) {
    if (children[i].type === Node.ELEMENT_NODE) {
      return children[i]
    } else if (children[i].text) {
      warn(`text "${children[i].text.trim()}" between v-if and v-else(-if) will be ignored`)
      children.pop()
    }
  }
}

function addIfConditions (el, condition) {
  if (!el.ifConditions) el.ifConditions = []
  el.ifConditions.push(condition)
}

function checkInFor (el) {
  let parent = el
  while (parent) {
    if (parent.for != null) {
      return true
    }
    parent = parent.parent
  }
  return false
}

function parseModifiers (name) {
  const match = name.match(modifierRE)
  if (match) {
    return match.reduce((map, m) => {
      // 去掉开头的 .
      map[m.slice(1)] = true
      return map
    }, {})
  }
}
