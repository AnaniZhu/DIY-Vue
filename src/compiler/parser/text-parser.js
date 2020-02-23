
const tagRE = /\{\{((?:.|\r?\n)+?)\}\}/g

// Vue 是可以自定义文本插入分隔符的，本处实现忽略
// 默认的文本分隔符为 ["{{", "}}"], 如果改成 ["${", "}"], 模板 <span>{{name}}</span> 就会由变成 <span>${name}</span>
export function parseText (text) {
  if (!tagRE.test(text)) return

  const tokens = []
  const rawTokens = []
  let lastIndex = tagRE.lastIndex = 0
  let match
  while ((match = tagRE.exec(text))) {
    let { index } = match
    if (lastIndex < index) {
      let tokenValue = text.slice(lastIndex, index)
      tokens.push(JSON.stringify(tokenValue))
      rawTokens.push(tokenValue)
    }

    const exp = match[1].trim()
    tokens.push(`_s(${exp})`)// _s 是 toString 的别名, instance/render-helpers 中定义
    rawTokens.push({ '@binding': exp })
    lastIndex = index + match[0].length
  }

  if (lastIndex < text.length) {
    let tokenValue = text.slice(lastIndex)
    tokens.push(JSON.stringify(tokenValue))
    rawTokens.push(tokenValue)
  }

  return {
    expression: tokens.join('+'),
    tokens: rawTokens
  }
}
