const fnExpRE = /^([\w$_]+|\([^)]*?\))\s*=>|^function\s*\(/
const simplePathRE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/

export function genHandlers (events, isNative) {
  return Object.keys(events)
    .reduce((str, name) => (str += `"${name}":${genHandler(name, events[name])},`), '{')
    .slice(0, -1) + '}'
}

function genHandler (name, handler) {
  if (!handler) return 'function(){}'

  if (Array.isArray(handler)) {
    return `[${handler.map(handler => genHandler(name, handler)).join(',')}]`
  }

  const isMethodPath = simplePathRE.test(handler.value)
  const isFunctionExpression = fnExpRE.test(handler.value)

  /**
   * 事件绑定值支持以下三种格式:
   * 对象方法: @click="person.say"
   * 字面量函数 @click="function(a, b){a + b}"
   * 执行表达式: @click="$event = 3"
   */

  if (!handler.modifiers) {
    // 如果是执行表达式则用函数包裹下，对象方法及字面量函数直接返回
    // eslint-disable-next-line no-new-func
    return isMethodPath || isFunctionExpression ? handler.value : new Function(`function($event){${handler.value}}`)
  } else {
    // TODO: 事件修饰符后续再做
  }
}
