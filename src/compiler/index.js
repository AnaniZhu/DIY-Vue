import { parse } from './parser'
import { generate } from './codegen'
import { baseOptions } from './options'

// 本项目编译实现只实现核心功能，不考虑太多边界情况，例如 IE 判断、xml 命令空间、svg
// 编译报错定位也暂不实现
// 性能方面也暂不考虑

function compiler (template, options) {
  const ast = parse(template, { ...baseOptions, ...options })

  // Vue 在此处存在优化步骤，此处暂时省略

  const { render, staticRenderFns } = generate(ast)

  return {
    ast,
    render,
    staticRenderFns
  }
}

export { compiler }
