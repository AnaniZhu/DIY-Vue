import { hasOwn, camelize, isPlainObject, map, hyphenate, isObject, toRawType } from 'shared/utils'
import { warn } from '../util'
import { observe } from '../observer'

export function validateProp (key, vm) {
  const { props: propsOptions, propsData } = vm.$options

  // 外部组件是否没传该 prop
  const absent = !hasOwn(propsData, key)

  let { type } = propsOptions[key]
  let value = propsData[key]

  if (type) {
    // if (key === 'propH') debugger
    let booleanTypeIdx = getTypeIndex(Boolean, type)

    // 布尔类型的默认值要特殊处理
    if (booleanTypeIdx > -1) {
      if (absent && !hasOwn(propsOptions[key], 'default')) {
        value = false
      } else if (value === '' || value === hyphenate(key)) {
        // <input checked /> 和 <input checked="checked"> 这种也视为 true, 浏览器会设置这种值
        // 如果该 prop 还允许 String 类型，则根据优先级来处理类型，靠前的优先级越高
        let stringTypeIdx = getTypeIndex(String, type)
        if (stringTypeIdx < 0 || stringTypeIdx > booleanTypeIdx) {
          value = true
        }
      }
    }
  }

  // 处理默认值
  if (value === undefined) {
    value = getPropDefaultValue(vm, key, propsOptions[key])
    observe(value)
  }

  // prop 验证
  assertProp(propsOptions[key], key, value, vm, absent)

  return value
}

function getTypeIndex (type, expectedTypes) {
  return Array.isArray(expectedTypes) ? expectedTypes.indexOf(type) : expectedTypes === type ? 0 : -1
}

function getPropDefaultValue (vm, key, option) {
  const { default: defaultVal, type } = option
  if (!defaultVal) return defaultVal

  // 如果是引用类型，需要通过一个函数还返回。防止多个实例引用同一份值
  if (isObject(defaultVal)) {
    warn(
      `Invalid default value for prop "${key}": Props with type Object/Array must use a factory function ` +
      'to return the default value.',
      vm
    )
  }

  // 当 default 为函数时，如果 prop type 也为 Function，则直接返回 default 函数，否则直接调用 default 返回该函数返回值
  // 遵循 Vue 源码实现。如果 type: [Function, String], default 为一个函数，依旧会被直接调用
  return typeof defaultVal === 'function' && type.name !== 'Function'
    ? defaultVal.call(vm)
    : defaultVal
}

const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/

function assertProp (option, key, value, vm, absent) {
  let { type, required, validator } = option
  // 验证必填
  if (required && absent) {
    warn(`Missing required prop: "${key}"`, vm)
    return
  }
  // 最终值为 null 或 undefined 且非必填的，不再进行验证
  if (value == null && !required) {
    return
  }

  // 验证类型
  if (type) {
    if (!Array.isArray(type)) type = [type]
    let valid = type.some(t => {
      // 通过函数的 name 属性拿到函数名
      if (simpleCheckRE.test(t.name)) {
        /**
         * 基本类型可能有两种情况:
         * 1. 字面量
         * 2. 包装类型, eg: new String('s') new Number(1)。这种情况下 typeof 并非是 string 和 number, 而是 object
         */
        // eslint-disable-next-line valid-typeof
        return typeof value === t.name.toLowerCase() || value instanceof t
      } else if (t.name === 'Object') {
        return isPlainObject(value)
      } else { // 其余构造函数验证，支持自定义构造函数
        return value instanceof t
      }
    })

    if (!valid) {
      const receivedType = toRawType(value)
      const receivedValue = styleValue(value, receivedType)
      warn(
        `Invalid prop: type check failed for prop "${key}". Expected ${type.map(t => t.name).join(', ')}` +
        `. got ${receivedType}: ${receivedValue}`
      )
    }
  }

  // 自定义验证
  if (validator && !validator(value)) {
    warn(`Invalid prop: custom validator check failed for prop "${key}".`, vm)
  }
}

// 包装值输出正确的字符串
function styleValue (value, type) {
  if (type === 'String') {
    return `"${value}"`
  } else if (type === 'Number') {
    return `${Number(value)}`
  } else {
    return `${value}`
  }
}

export function normalizeProps (props, vm) {
  if (!props) return
  /**
   * props 有以下两种格式
   * - 数组，代表声明的 prop keys。eg: props: ['a', 'b', 'c']
   * - 对象，key 代表 props 名，值又有两种形式
   *   - val 是对象, 可传递type(代表类型，可以是数组)、required(是否必须传入)、default(默认值)、validator(验证函数)。eg: props: {a: {type: Number, default: 1, validator: () => true}}
   *   - val 直接是一个类型或类型数组。 eg: props: {a: Number, b: [String, Number]}
   * 上述格式的 key 允许分隔符命名，下面统一转成小驼峰命名
   */
  let _props = {}
  let name
  if (Array.isArray(props)) {
    props.forEach(key => {
      if (typeof key === 'string') {
        name = camelize(key)
        _props[name] = {
          type: null
        }
      } else {
        warn('props must be strings when using array syntax.', vm)
      }
    })
  } else if (isPlainObject(props)) {
    map(props, (key, val) => {
      name = camelize(key)
      _props[name] = isPlainObject(val) ? val : { type: val }
    })
  } else {
    warn(`Invalid value for option "props": expected an Array or an Object, but got ${toRawType(props)}.`, vm)
  }
  return _props
}
