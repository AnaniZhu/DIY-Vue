
import Vue from './src/core/instance'

const vm = new Vue({
  el: '#app',
  data () {
    return {
      showAuthor: true,
      showComputed: true,
      num: 1,
      title: '响应式编程',
      info: {
        time: '2018-12-12',
        author: {
          name: '朱文涵',
          age: 16
        }
      },
      list: [
        { id: 0 },
        { id: 1 },
        { id: 2 }
      ],
      arr: [[1, 2], 3, 4]
    }
  },
  computed: {
    count () {
      console.log('computed count get')
      return this.num * 10
    },
    text () {
      console.log('computed text get')
      return `哈哈哈，真正的长度是 ${this.count / 10}`
    }
  },
  watch: {
    title (val, oldVal) {
      console.log('title change', val, oldVal)
      this.info.author = {}
    },
    list: {
      deep: true,
      handler () {
        console.log('list change')
        this.num = this.num * 2
      }
    },
    'info.author': {
      // immediate: true,
      deep: true,
      handler (val) {
        // this.info.time = 20
        console.log('新修改的值', val)
        this.list.push({ id: 'author' })
      }
    },
    count: [{ immediate: true, handler: 'cb1' }, 'cb2']
  },
  beforeCreate () {
    console.log('beforeCreate', this.title)
  },
  created () {
    console.log('created', this.title)
  },
  beforeMount () {
    console.log('beforeMount', document.getElementById('title'))
  },
  mounted () {
    console.log('mounted', document.getElementById('title'))
  },
  beforeUpdate () {
    console.log('beforeUpdate', document.getElementById('title').innerText)
  },
  updated () {
    console.log('updated', document.getElementById('title').innerText)
  },
  methods: {
    cb1 () {
      console.log('count cb 1')
    },
    cb2 () {
      console.log('count cb 2')
    },
    run () {
      this.title = 2
      this.$nextTick().then((res) => {
        console.log(res, 'nextTick')
      })
    }
  },
  render () {
    return `
      <h1 id="title">${this.title}</h1>
      <p>时间: ${this.info.time}</p>
      ${this.showAuthor ? `<p>
      姓名: <span style="color: red;">${this.info.author.name}</span>
      年龄: <span style="font-size: 18px;">${this.info.author.age}</span>
      性别: <span style="font-size: 18px;">${this.info.author.gender}</span>
      </p>` : ''}
      ${this.showComputed ? `<h2>数量：${this.count} --------- (${this.text})</h2>` : ''}
      <ul>
        ${this.list.map(({ id }) => `<li>${id}</li>`).join('')}
      </ul>
      ${this.arr}
    `
  }
})

window.vm = vm
