import Dep from './dep'
import { proxyArrayProto } from './array'

import { isIteratorObj } from 'shared/utils'

export default class Observer {
  constructor (value) {
    /**
     * 给目标值定义标志位 __ob__, 有以下作用
     * 1. 判断该值是否是被观测过
     * 2. 数组变异方法、$set、$delete 更新需要用到这个 observer 实例 上 dep 收集到的依赖
     */
    Object.defineProperty(value, '__ob__', {
      value: this,
      enumerable: false
    })
    this.value = value
    this.dep = new Dep()

    // 代理数组，重写 push/pop/unshift/shift/reverse/sort 等方法从而可以重新渲染视图
    if (Array.isArray(value)) {
      Object.setPrototypeOf(value, proxyArrayProto)
    }
    this.walk()
  }

  walk () {
    // Vue 中将 array 和 object 分开，数组不监听 key，直接 observe 里面的值
    // 因为数组某些状况无法检测，比如数组的 length 属性无法二次定义，检测不到 arr.length = xx 的情况
    // 还有如果允许直接进行数组下标赋值的话，假设：
    // 数组长度为10，执行 arr[0] = xx 可以更新视图，而执行 arr[10] = xx 就无法更新，可能会让人产生困惑(因为下标超过初始长度，相当于新的属性)
    // 还要就是对数组的下标直接赋值的场景很少，大型数组也很常见，给每一个下标设置 get, set 的收益很低

    // 本实现不考虑上述情况，不区分数组和对象，所以在 key 的 defineProperty getter 中也不需要额外调用 dependArray 来收集数组的依赖
    // 而且 Vue 源码中 dependArray 的实现大致是这样: 如果 data 顶级属性为一个嵌套数组，后代数组也会把第一级数组的依赖收集一遍，即使后代数组没有被用到
    // 看以下例子
    // eg: vue 实例 data 属性为 {arr: [[1,2], 3]}, 且 render 函数用到了 arr[1]。
    // 此时子级数组[1,2]在渲染函数中没用到，但 Vue 的实现依旧将此依赖收集到 renderWatcher 中,
    // 导致当执行 arr[0].push(3) 的时候会触发 renderWatcher 更新，其实此时完全没必要触发更新

    // 递归遍历所有 key 设置 getter 和 setter
    Object.keys(this.value).forEach(key => defineReactive(this.value, key))
  }
}

export function observe (value) {
  if (!Array.isArray(value) && Object.prototype.toString.call(value) !== '[object Object]') return
  const __ob__ = value.__ob__ || new Observer(value)
  return __ob__
}

export function defineReactive (obj, key, value) {
  let getter
  let setter
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property) {
    getter = property.get
    setter = property.set
  }

  if (!getter && value === undefined) {
    value = obj[key]
  }

  const dep = new Dep()

  // Vue 源码中直接递归所有对象定义 getter, setter
  // 此处实现只在父级对象被访问的时候，才定义所有子属性的值的 getter setter, 类似懒加载
  let childOb

  // 暂时恢复 Vue 的写法
  // let childOb = observe(value)

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get () {
      const val = getter ? getter.call(obj) : value

      if (Array.isArray(val) || Object.prototype.toString.call(val) === '[object Object]') {
        childOb = observe(val)
      }
      if (Dep.target) {
        dep.depend()

        /**
         *  此处收集的依赖可在下述场景用于通知 watchers 更新
         *  - 数组的变异方法
         *  - $set
         *  - $delete
         */
        childOb && childOb.dep.depend()
      }
      return val
    },
    set (newVal) {
      const val = getter ? getter.call(obj) : value
      // eslint-disable-next-line no-self-compare
      if (newVal === val || (newVal !== newVal && val !== val)) return

      if (setter) {
        setter.call(obj, newVal)
      } else {
        value = newVal
      }
      // childOb = observe(newVal)
      dep.notify()
    }
  })
}

export function set (obj, key, val) {
  if (Array.isArray(obj) && Number.isInteger(+key)) {
    obj.splice(key, 1, val)
    return
  }

  // 非新增的 key（可直接触发对应 key 的 setter） 以及非观测对象，直接赋值
  if (Object.keys(obj).includes(key) || !obj.__ob__) {
    obj[key] = val
    return
  }

  defineReactive(obj, key, val)
  obj.__ob__.dep.notify()
}

export function del (obj, key) {
  if (!isIteratorObj(obj) || !Object.keys(obj).includes(key)) return

  delete obj[key]

  // 兼容非响应式对象
  obj.__ob__ && obj.__ob__.dep.notify()
}
