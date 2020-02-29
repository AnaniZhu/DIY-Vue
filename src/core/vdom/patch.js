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

function createElm (vnode, container) {
  const { tag, data, children, text, componentInstance } = vnode

  // 如果当前 vnode 是组件的话，则直接挂载组件到容器上
  if (componentInstance) {
    componentInstance.$mount(container)
    return
  }

  let node
  if (tag) {
    node = document.createElement(tag)
    data && injectData(node, data)
    children && children.forEach(child => createElm(child, node))
  } else if (text) {
    node = document.createTextNode(text)
  }

  node && container.appendChild(node)
}

function patchVnode (oldVnode, vnode, container) {
  // TODO: 后续添加 patch 功能，增加 dom diff
  container.innerHTML = ''
  createElm(vnode, container)
}

function invokeDestroyHook () {

}

function injectData (el, data) {
  Object.keys(data).forEach(key => {
    switch (key) {
      case 'domProps':
        Object.entries(data.domProps).forEach(([prop, val]) => {
          el[prop] = val
        })
        break
      case 'attrs':
        Object.entries(data.attrs).forEach(([attr, val]) => {
          el.setAttribute(attr, val)
        })
        break
      case 'class':
        el.classList.add(data.class)
        break
      case 'style':
        el.style = data.style
        break
      case 'on':
        Object.entries(data.on).forEach(([name, handlers]) => {
          handlers.forEach(h => el.addEventListener(name, h))
        })
        break
    }
  })
}
