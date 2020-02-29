import { hasOwn, hyphenate } from 'shared/utils'

export function extractPropsFromVNodeData (propsOptions, data) {
  if (!propsOptions || !data) return

  let propsData = {}

  if (data) {
    const { props, attrs } = data

    Object.keys(propsOptions).forEach(key => {
      let altKey = hyphenate(key)

      checkProps(propsData, props, key, altKey, true) ||
      checkProps(propsData, attrs, key, altKey, false)
    })
  }

  return propsData
}

function checkProps (propsData, hash, key, altKey, preserve) {
  if (!hash) return

  key = hasOwn(hash, key) ? key : hasOwn(hash, altKey) ? altKey : ''

  if (!key) return

  propsData[key] = hash[key]

  !preserve && (delete hash[key])

  return true // 标志查找到该属性
}
