import { isIteratorObj } from '../../shared/utils'

// 存放已经访问过的值的dep，避免再次访问，提升性能
// 比如一个对象里两个属性的值是同一份引用，值都相等，此时就没必要遍历两遍了
const seenObjects = new Set()

// 深度遍历对象，从而触发对象每一个属性的 getter, 用于依赖收集
export function traverse (obj) {
  _traverse(obj)
  seenObjects.clear()
}

function _traverse (obj) {
  // Vue 的实现区分了数组和对象，我们的代码在响应式就不区分数组和对象，此处也一样
  if (isIteratorObj(obj)) {
    Object.values(obj).forEach(val => {
      if (val.__ob__) {
        const depId = val.__ob__.dep.id
        if (seenObjects.has(depId)) {
          return
        } else {
          seenObjects.add(depId)
        }
      }
      _traverse(val)
    })
  }
}
