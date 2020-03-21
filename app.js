
import Vue from './src/core/instance'
const vm = new Vue({
  el: '#app',
  components: {
    Child: {
      // beforeCreate () {
      //   console.log('child beforeCreate')
      // },
      // created () {
      //   console.log('child created')
      // },
      // beforeMount () {
      //   console.log('child beforeMount')
      // },
      // mounted () {
      //   console.log('child mounted')
      // },
      // beforeUpdate () {
      //   console.log('child beforeUpdate')
      // },
      // updated () {
      //   console.log('child updated')
      // },
      props: {
        // 基础的类型检查 (`null` 和 `undefined` 会通过任何类型验证)
        propA: Number,
        // 多个可能的类型
        propB: [String, Number],
        // 必填的字符串
        propC: {
          type: String,
          required: true
        },
        propE: Object
      },
      data () {
        return {
          val: 'child'
        }
      },
      template: `
      <div style="border: 1px solid red;">
        {{val}} {{propA}}
        <p>{{propB}}</p>
        <p>{{propE.a}}-{{propE.b}}</p>
        <slot name="header">
          <span> header 插槽 - 默认占位 - 父组件未传递该插槽</span>
        </slot>
        <slot></slot>
        <h2 style="color: blue">我是子组件</h2>
        <slot name="footer" :height="16" v-bind="{a: 1, b: 2, height: 3}">
          <span> footer 插槽作用域 - 默认占位 - 父组件未传递该插槽</span>
        </slot>
      </div>`
    }
  },
  template: `
    <div>
      <div v-for="({id}) in list" :key="id">{{id}}</div>
    </div>
  `,
  // template: `
  // <div v-if="false" a-b="3" slot-scope="row">1</div>
  // <div v-else-if="false">2</div>
  // <div v-else ref="app=3" id="app" class="container" v-cloak :b="3">
  //   <h1 :key="num">{{title}}</h1>
  //   <ul @click="run">
  //     <li ref="a" v-for="(row, index, i) in list">{{row.id}}</li>
  //   </ul>
  //   <br>
  //   <h1>
  //     <span slot-scope="row">123</span>
  //     <span slot="a" slot-scope="row">123</span>
  //     <div slot="b"></div>
  //   </h1>
  //   <p>时间: {{info.time}}</p>
  //   <input v-model.number="num">
  //   <!-- <h2>{{info.my}}</h2> -->
  //   <p>
  //     作者姓名: <span style="color: red;">{{info.author.name}}</span>
  //     年龄: <span style="font-size: 18px;">{{info.author.age}}</span>
  //   </p>
  //   <h2 v-if="showComputed">数量: {{count}} ({{text}})</h2>
  //   <Child
  //     :propA="123"
  //     :propB="title"
  //     propC="1"
  //     :propD="0"
  //     :propE="obj">
  //     <h3>我是子组件默认插槽 - 第一个元素</h3>
  //     <h3>我是子组件默认插槽 - 第二个元素</h3>
  //     <h3 slot="footer" slot-scope="row">哈哈哈，我是插槽作用域，我的作用域值是 {{row}}</h3>
  //   </Child>
  //   {{arr[2]}}
  // </div>`,
  data () {
    return {
      obj: { a: 1 },
      showFirst: false,
      showSecond: false,
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
        { id: 2 },
        { id: 3 }
      ],
      arr: [[[1], 2], [3, 4], 5]
    }
  },
  computed: {
    count () {
      // console.log('computed count get')
      return this.num * 10
    },
    text () {
      // console.log('computed text get')
      return `哈哈哈，真正的长度是 ${this.count / 10}`
    }
  },
  watch: {
    title (val, oldVal) {
      // console.log('title change', val, oldVal)
      this.info.author = {}
    },
    list: {
      deep: true,
      handler () {
        // console.log('list change')
        this.num = this.num * 2
      }
    },
    'info.author': {
      // immediate: true,
      deep: true,
      handler (val) {
        // this.info.time = 20
        // console.log('新修改的值', val)
        this.list.push({ id: 'author' })
      }
    },
    count: [{ immediate: true, handler: 'cb1' }, 'cb2']
  },
  // beforeCreate () {
  //   console.log('beforeCreate', this.title)
  // },
  // created () {
  //   console.log('created', this.title)
  // },
  // beforeMount () {
  //   console.log('beforeMount', document.getElementById('title'))
  // },
  // mounted () {
  //   console.log('mounted', document.getElementById('title'))
  // },
  // beforeUpdate () {
  //   console.log('beforeUpdate', document.getElementById('title').innerText)
  // },
  // updated () {
  //   console.log('updated', document.getElementById('title').innerText)
  // },
  methods: {
    cb1 () {
      // console.log('count cb 1')
    },
    cb2 () {
      // console.log('count cb 2')
    },
    run () {
      this.title = 2
      // this.$nextTick().then((vm) => {
      //   console.log('nextTick')
      // })
    }
  }
  // render () {
  //   return `
  //     <h1 id="title">${this.title}</h1>
  //     <p>时间: ${this.info.time}</p>
  //     ${this.showAuthor ? `<p>
  //     姓名: <span style="color: red;">${this.info.author.name}</span>
  //     年龄: <span style="font-size: 18px;">${this.info.author.age}</span>
  //     性别: <span style="font-size: 18px;">${this.info.author.gender}</span>
  //     </p>` : ''}
  //     ${this.showComputed ? `<h2>数量：${this.count} --------- (${this.text})</h2>` : ''}
  //     <ul>
  //       ${this.list.map(({ id }) => `<li>${id}</li>`).join('')}
  //     </ul>
  //     ${this.arr[2]}
  //   `
  // }
})

window.vm = vm
