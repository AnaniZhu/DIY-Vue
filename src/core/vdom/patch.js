import { updateAttrs, updateEvents, updateDomProps } from './modules'
import { ELEMENT_TYPE, TEXT_TYPE, COMPONENT_TYPE } from './vnode'
import { updateChildComponent, activeInstance } from '../instance/lifecycle'
import { warn } from '../util/index'

export function patch (oldVnode, vnode, container) {
  if (vnode) {
    if (oldVnode) {
      patchVnode(oldVnode, vnode, container)
    } else {
      createElm(vnode, container)
    }
  } else {
    oldVnode && invokeDestroyHook(oldVnode, container)
  }
}

function createElm (vnode, container, refElm) {
  const { tag, data, type, children, text } = vnode

  // 如果当前 vnode 是组件的话，则直接挂载组件到容器上
  if (type === COMPONENT_TYPE) {
    createComponent(vnode, container)
    return
  }

  let node
  if (type === ELEMENT_TYPE) {
    node = document.createElement(tag)
    patchData(null, data, node)

    if (Array.isArray(children)) {
      checkDuplicateKeys(children)
      children.forEach(child => createElm(child, node))
    }
  } else if (type === TEXT_TYPE) {
    node = document.createTextNode(text)
  }

  if (node) {
    vnode.elm = node
    refElm ? container.insertBefore(node, refElm) : container.appendChild(node)
  }
}

function createComponent (vnode, parentElm) {
  const { componentOptions: { Ctor, options } } = vnode
  vnode.componentInstance = new Ctor({
    ...options,
    _isComponent: true, // 标识该实例是个子组件, 实例 init 时会用到
    _parentVnode: vnode, // 保留自身 vnode 的引用, 让实例可以通过 vm.$options._parentVnode 访问到对应的 vnode, 同时可以拿到 componentOptions 里的 propsData/listeners/children 等
    parent: activeInstance // 标识父组件
  })
  vnode.componentInstance.$mount(parentElm)
}

function patchVnode (oldVnode, vnode, container) {
  if (vnode.type === COMPONENT_TYPE) {
    vnode.componentInstance = oldVnode.componentInstance
    updateChildComponent(oldVnode, vnode)
  }

  // 先 patch 属性
  if (isPatchable(vnode)) {
    oldVnode.data = oldVnode.data || {}
    vnode.data = vnode.data || {}
    patchData(oldVnode.data, vnode.data, oldVnode.elm)
  }

  // 非文本节点 patch 子元素
  if (!vnode.text) {
    const oldChildren = oldVnode.children
    const { children } = vnode
    if (oldChildren && children) {
      updateChildren(oldVnode.elm, oldChildren, children)
    } else if (oldChildren) {
      removeVnodes(container, oldChildren)
    } else if (children) {
      addVnodes(container, null, children)
    }
  } else if (vnode.text !== oldVnode.text) { // 文本节点直接修改文本内容
    oldVnode.elm.textContent = vnode.text
  }

  vnode.elm = oldVnode.elm
}

// vnode diff 算法
function updateChildren (parentElm, oldChildren, children) {
  // if (children.length === 1) debugger
  let oldStartIdx = 0
  let newStartIdx = 0
  let oldEndIdx = oldChildren.length - 1
  let newEndIdx = children.length - 1

  let oldStartVnode = oldChildren[0]
  let oldEndVnode = oldChildren[oldEndIdx]

  let newStartVnode = children[0]
  let newEndVnode = children[newEndIdx]

  checkDuplicateKeys(children)

  /**
   * 新旧子元素集合分别有个头尾指针，初始化都指向第一个和最后一个子元素
   * 新旧子元素 diff 对比步骤如下:
   *    旧       新
   * 1. 头  ==?  头        - 如果相同，新旧元素的头指针向后挪一位
   * 2. 尾  ==?  尾        - 如果相同，新旧元素的尾指针向前挪一位
   * 3. 头  ==?  尾        - 如果相同，旧元素的头指针向后挪一位，新元素的尾指针向前挪一位
   * 4. 尾  ==?  头        - 如果相同，旧元素的尾指针向前挪一位，新元素的头指针向后挪一位
   * 5. 当上述步骤比对完还没找到相同 vnode，则将新元素的头结点在旧元素集合里查找，看看是否有相同 vnode
   *  - 如果找到，将找到的结点（真实dom）插入旧元素头指针指向的真实 dom 之前。同时将找到的旧元素结点在数组里所在位置置空，新元素的头指针向后挪一位
   *  - 如果没找到，则将新子元素的 vnode 生成真实 dom，同时插入到旧元素头指针指向的真实 dom 之前。新元素的头指针向后挪一位
   * 6. 上述步骤循环执行，直到新旧子元素的头尾指针错过（头指针在尾指针之后）
   * 7. 因为上面查找的时候，会将找到的旧元素所在数组里的位置置空，所以要在进行比对前进行判断跳过，也就是下面的第1、2个判断
   * 8. 当比对结束时，新旧元素的头尾指针可能还未错过，要进行扫尾操作:
   *  - 当比对完之后旧元素集合的头尾指针还没错过，可能是旧元素集合数量大于新元素集合数量（或者是剩下的旧元素在新元素集合中没有对应的），则需要把多余的旧子元素从 DOM 树移除
   *  - 当比对完之后新元素集合的头尾指针还没错过，可能是旧元素集合数量小于新元素集合数量，则需要把多余的新子元素添加到 DOM 树中
   */
  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    /**
     * 前面两个判断是为了处理如下情况:
     * 当前的头和尾可能在之前已经比对过，且因为跟新元素存在对应，已经挪至到正确的位置了
     * 挪换位置后，原本下标所在元素置为 null (被移除)，这时就不用再比较了，直接跳过进入下一个比较
     */
    if (!oldStartVnode) {
      oldStartVnode = oldChildren[++oldStartIdx]
    } else if (!oldEndVnode) {
      oldEndVnode = oldChildren[--oldEndIdx]
    } else if (sameVnode(oldStartVnode, newStartVnode)) { // 头跟头比
      patchVnode(oldStartVnode, newStartVnode)
      oldStartVnode = oldChildren[++oldStartIdx]
      newStartVnode = children[++newStartIdx]
    } else if (sameVnode(oldEndVnode, newEndVnode)) { // 尾跟尾比
      patchVnode(oldEndVnode, newEndVnode)
      oldEndVnode = oldChildren[--oldEndIdx]
      newEndVnode = children[--newEndIdx]
    } else if (sameVnode(oldStartVnode, newEndVnode)) { // 头跟尾比
      patchVnode(oldStartVnode, newEndVnode)
      oldStartVnode = oldChildren[++oldStartIdx]
      newEndVnode = children[--newEndIdx]
    } else if (sameVnode(oldEndVnode, newStartVnode)) { // 尾跟头比
      patchVnode(oldEndVnode, newStartVnode)
      oldEndVnode = oldChildren[--oldEndIdx]
      newStartVnode = children[++newStartIdx]
    } else {
      // 上述情况都不满足，则在 oldChildren 里查找有没有跟 newStartVnode 相等的节点
      let targetIdx
      for (let i = oldStartIdx + 1; i < oldEndIdx; i++) {
        // oldChildren 中可能存在被置空的元素（调换了位置，原本位置元素被移除），此处做兼容判断
        if (oldChildren[i] && sameVnode(oldChildren[i], newStartVnode)) {
          targetIdx = i
          break
        }
      }

      // 如果在 oldChildren 中找到，则进行 patch 之后再将旧元素挪至 oldStartVnode 之前
      if (targetIdx) {
        let targetVnode = oldChildren[targetIdx]

        patchVnode(targetVnode, newStartVnode)
        parentElm.insertBefore(targetVnode.elm, oldStartVnode.elm)

        oldChildren[targetIdx] = null // 找到的目标元素已经挪了位置，其原来所在位置置为空，标识被移除
      } else {
        // 没找到则说明是新节点，直接插入到旧元素之前
        createElm(newStartVnode, parentElm, oldStartVnode.elm)
      }

      newStartVnode = newStartVnode[++newStartIdx]
    }
  }

  // 当新的 children 全部插入完成，oldChild 还有剩余没匹配的，则为多余的元素，应该删除
  if (oldStartIdx <= oldEndIdx) {
    removeVnodes(parentElm, oldChildren, oldStartIdx, oldEndIdx)
  } else if (newStartIdx <= newEndVnode) {
    // 当 oldStartIdx > oldEndIdx 则意味着 oldChildren 全部被匹配完
    // 如果此时 newStartIdx 小于 newEndIdx，则意味着新的 children 还没被处理完
    // 新的元素数量比老的数量要多(children.length > oldChildren.length)，需要把新的元素增加进去

    // 同时可能尾部元素被比对过且与旧元素存在对应，所以新的元素要插入到尾部元素之前
    let refElm = children[newEndIdx + 1] ? children[newEndIdx + 1].elm : null
    addVnodes(parentElm, refElm, children, newStartIdx, newEndIdx)
  }
}

function sameVnode (oldVnode, vnode) {
  return oldVnode.tag === vnode.tag && oldVnode.key === vnode.key
}

function addVnodes (parentElm, refElm, vnodes, startIdx = 0, endIdx = vnodes ? vnodes.length : 0) {
  for (; startIdx <= endIdx; startIdx++) {
    let vnode = vnodes[startIdx]
    refElm ? parentElm.insertBefore(vnode, refElm) : parentElm.appendChild(vnode)
  }
}

function removeVnodes (parentElm, vnodes, startIdx = 0, endIdx = vnodes ? vnodes.length : 0) {
  for (; startIdx <= endIdx; startIdx++) {
    // TODO: 需要做一些销毁操作，比如 dom 事件监听器的移除，组件的销毁钩子
    parentElm.removeChild(vnodes[startIdx].elm)
  }
}

function isPatchable (vnode) {
  // 只有元素节点(有 tag)才需要 patch

  /**
   * 如果是组件，需要找到根节点的标签
   * Q: 为什么需要递归查找？
   * A: 可能存在一个组件 render 直接返回另一个组件的情况，这个时候需要查找该返回组件的根标签
   * eg:
   *  - let Child2 = {render (h) {return h('div', '你好')}}
   *  - let Child = {render (h) {return h(Child2)}}
   * 这种场景下，真正的标签应该为 div
   */

  while (vnode.componentInstance) {
    vnode = vnode.componentInstance._vnode
  }
  return vnode.tag
}

function invokeDestroyHook () {
  // TODO: 销毁操作
}

function patchData (oldData, data, el) {
  if (!oldData && !data) return
  updateAttrs(oldData && oldData.attrs, data.attrs, el)
  updateDomProps(oldData && oldData.domProps, data.domProps, el)
  updateEvents(oldData && oldData.on, data.on, el)
}

function checkDuplicateKeys (children) {
  const seenKeys = {}
  children.forEach(({ key }) => {
    if (key != null) {
      if (seenKeys[key]) {
        warn(`Duplicate keys detected: '${key}'. This may cause an update error.`)
      } else {
        seenKeys[key] = true
      }
    }
  })
}
