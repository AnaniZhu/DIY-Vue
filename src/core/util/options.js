import { hasOwn, camelize, capitalize } from 'shared/utils'

export function resolveAsset (options, key) {
  if (!key) return

  /**
   * 兼容以下形式的命名查找
   * el-input -> elInput
   * el-input -> ElInput
   * child -> Child
   */
  if (hasOwn(options, key)) return options[key]

  let camelizeKey = camelize(key)
  if (hasOwn(options, camelizeKey)) return options[camelizeKey]

  let PascalCaseId = capitalize(camelizeKey)
  if (hasOwn(options, PascalCaseId)) return options[PascalCaseId]
}
