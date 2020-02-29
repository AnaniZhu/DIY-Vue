import { isUnaryTag, warn } from '../util'

const ncname = '[a-zA-Z_][\\w\\-\\.]*'

const startTagOpen = new RegExp(`^<(${ncname})`)
const startTagClose = /^\s*(\/)?>/
const endTag = new RegExp(`^<\\/(${ncname})>`)
const attr = /^\s+(?<attr>[^=<>'"`/\s]+)(?:=("(?<double>[^"]*)"|'(?<single>[^']*)'|`(?<backquote>[^`]*)`|(?<other>[^=>\s\n]*)))?/

const comment = /^<!--[\s\S]*?-->/

export function parseHTML (template, options) {
  let stack = []
  let matched
  let index

  const { start, end, char } = options

  let i = 0

  while (template.length) {
    if (i++ > 1000) {
      console.error('死循环')
      break
    }

    // debugger

    index = template.indexOf('<')

    // index 为 0 的时候，都是处理标签
    if (index === 0) {
      // 匹配注释
      if ((matched = template.match(comment))) {
        // Vue 有保留注释的配置项，本实现忽略
        template = template.slice(matched[0].length)
        continue
      }

      // Vue 在此处考虑了 conditionalComment 和 Doctype, 本实现忽略

      // 匹配闭标签
      // 闭标签匹配需要在开标签之前，当出现先闭合标签的情况直接报错
      if ((matched = template.match(endTag))) {
        template = template.slice(matched[0].length)
        let lastTag = stack[stack.length - 1]
        if (matched[1] === lastTag) {
          stack.pop()
          end(matched[1])
        } else {
          if (matchUnClosedTags(matched[1])) {
            return
          }
        }
        continue
      }

      // 匹配开标签前缀
      if ((matched = template.match(startTagOpen))) {
        let [matchStr, tagName] = matched
        template = template.slice(matchStr.length)

        const attrs = []
        // 匹配属性
        while ((matched = template.match(attr))) {
          template = template.slice(matched[0].length)
          let { attr, double, single, backquote, other } = matched.groups
          attrs.push({
            name: attr,
            value: double || single || backquote || other || ''
          })
        }

        // 匹配开标签后缀
        matched = template.match(startTagClose)
        if (matched) {
          template = template.slice(matched[0].length)

          // 当匹配到了完整的开标签之后，需要入栈
          // 有些标签不需要闭合，只有需要闭合的标签才需要为了后续的查找闭合标签入栈
          const isUnary = isUnaryTag(tagName)
          if (!isUnary) {
            stack.push(tagName)
          }

          start(tagName, attrs, isUnary)
        }
        continue
      }
    }

    // index 不为 0，则说明含有文本, 还需要兼容 < 符号是普通文本的情况
    if (index > 0) {
      // debugger
      let rest = template.slice(index)

      // 如果既不是标签也不是注释，那 < 肯定是普通文本, 且存在多个 < 的普通文本，所以要循环查找
      while (
        !startTagOpen.test(rest) &&
        !endTag.test(rest) &&
        !comment.test(rest)
      ) {
        let next = rest.indexOf('<', 1)
        if (next === -1) break

        index += next
        rest = template.slice(index)
      }

      let text = template.slice(0, index)
      template = template.slice(index)

      char(text)
    }

    /**
     * 可能存在以下情况:
     * 有文本元素与根元素同级， 此时模板还未匹配完，但已经匹配不到 < 符号
     * 例如: '<div>123</div>123'
     */
    if (index < 0) {
      char(template)
      template = ''
    }
  }

  // 当循环结束后，栈内还存在元素，则说明这些元素未闭合
  matchUnClosedTags()

  function matchUnClosedTags (tagName) {
    for (let len = stack.length, i = len - 1; i >= 0; i--) {
      if (tagName !== stack[i]) {
        warn(`${stack[i]} 未匹配到闭合标签`)
        return true
      }
    }
  }
}
