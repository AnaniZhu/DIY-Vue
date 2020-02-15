import { nextTick } from '../util'

const watchersQueue = []

let flushing = false
let waiting = false
let index = 0

// 存放着队列中所有 watcher id
// 为什么有了数组还需要额外 map 来储存？ 因为数组还需要遍历，map 查询更快
let watcherMap = {}

export function queueWatcher (watcher) {
  // 队列中 watcher 存在时直接忽略，不存在则插入至指定位置，优先级根据 id 排序
  if (watcherMap[watcher.id]) return

  watcherMap[watcher.id] = true

  // nextTick 回调已经正在执行中，此时就不能直接 push，需要按顺序插入
  if (flushing) {
    let i = watchersQueue.length - 1
    // 将新的 watcher 按 id 排序插入到正确位置，保证更新顺序
    // 且新 watcher 一定要插入在当前正在执行的 watcher 之后
    while (i > index && watcher.id < watchersQueue[i].id) {
      i--
    }
    watchersQueue.splice(i + 1, 0, watcher)
  } else {
    watchersQueue.push(watcher)
  }

  if (!waiting) {
    waiting = true
    nextTick(() => {
      flushing = true

      // 排序保证更新顺序
      watchersQueue.sort((a, b) => a.id - b.id)

      // length 不可提前存储，遍历过程中可能会插入新的 watcher
      for (index = 0; index < watchersQueue.length; index++) {
        let watcher = watchersQueue[index]
        watcher.run()

        // 当前 watcher 执行完毕后，存储标志需清除，保证后续相同的 watcher 能正确触发更新
        watcherMap[watcher.id] = null
      }

      // 重置操作
      resetSchedulerState()
    })
  }
}

function resetSchedulerState () {
  waiting = false
  flushing = false
  index = 0
  watchersQueue.length = 0
  watcherMap = {}
}
