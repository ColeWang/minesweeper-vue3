window.onload = () => {
  const { reactive, createApp, watch } = Vue

  function initMatrix (row, col) {
    return Array.apply(null, Array(row)).map((item, row) => {
      return Array.apply(null, Array(col)).map((item, col) => {
        return { row: row, col: col, state: 0, open: false, label: false }
      })
    })
  }

  // 雷周围数字
  function getLatticeIndex (matrixArr) {
    const rowLength = matrixArr.length
    const colLength = matrixArr[0].length
    for (let row = 0; row < rowLength; row++) {
      for (let col = 0; col < colLength; col++) {
        const curContent = matrixArr[row][col]
        if (curContent && curContent.state === 9) {
          continue
        }
        const posArr = [[row - 1, col], [row - 1, col - 1], [row - 1, col + 1], [row, col - 1], [row, col + 1], [row + 1, col + 1], [row + 1, col - 1], [row + 1, col]]
        let mineNum = 0
        for (let i = 0; i < 8; i++) {
          const _row = posArr[i][0]
          const _col = posArr[i][1]
          if (_row < 0 || _col < 0 || _row > rowLength - 1 || _col > colLength) {
            continue
          }
          const curPos = matrixArr[_row][_col]
          if (curPos && curPos.state === 9) {
            mineNum++
          }
          matrixArr[row][col].state = mineNum
        }
      }
    }
    return matrixArr
  }

  // 生成二维矩阵
  function createMatrix (row, col, mine) {
    let count = 0
    const matrixArr = initMatrix(row, col)
    // 生成随机数
    while (count < mine) {
      const putRow = Math.floor(Math.random() * row)
      const putCol = Math.floor(Math.random() * col)
      if (matrixArr[putRow][putCol].state !== 9) {
        count++
        matrixArr[putRow][putCol].state = 9
      }
    }
    return getLatticeIndex(matrixArr)
  }

  const App = {
    template: `<div class="box">
                 <div class="top">
                   <div class="playing" :class="{'fail': !data.playing}" @click="onReset"></div>
                   <div class="counter">{{data.counter > 9 ? '0' + data.counter : '00'+ data.counter}}</div>
                 </div>
                 <div class="wicket">
                   <div class="row" v-for="(rowItem, row) in data.matrixArr">
                     <div class="col"
                          :class="isStyle(colItem)"
                          @click.prevent="handleOpenBulk(colItem)"
                          @contextmenu.prevent="handleMineLabel(colItem)"
                          v-for="(colItem, col) in rowItem">
                      {{colItem.state !== 0 && colItem.state !== 9 ? colItem.state : ''}}
                     </div>
                   </div>
                 </div>
               </div>`,
    setup () {
      // 游戏参数
      const param = {
        row: 16, // 行
        col: 30, // 列
        mine: 99, // 地雷
      }

      const data = reactive({
        matrixArr: createMatrix(param.row, param.col, param.mine),
        counter: param.mine, // 剩余标记数
        isOpen: 0, // 计数打开数量 open
        playing: true
      })

      function isStyle (item) {
        const end = item.end && !!item.end
        const open = !item.open && !item.label && 'open'
        const label = item.label && 'a10'
        return end ? 'end' : `a${item.state} ${open || label}`
      }

      function reactionChain (row, col) {
        const rowMax = data.matrixArr.length
        const colMax = data.matrixArr[0].length
        if (row < 0 || col < 0 || row > rowMax - 1 || col > colMax - 1) {
          return
        }
        const curPos = data.matrixArr[row][col]
        if (curPos.open || curPos.label) {
          return
        }
        data.isOpen++
        curPos.open = true
        if (curPos.state > 0) {
          return
        }
        reactionChain(row, col - 1)
        reactionChain(row, col + 1)
        reactionChain(row - 1, col)
        reactionChain(row - 1, col - 1)
        reactionChain(row - 1, col + 1)
        reactionChain(row + 1, col)
        reactionChain(row + 1, col - 1)
        reactionChain(row + 1, col + 1)
      }

      // 左键
      function handleOpenBulk (item) {
        if (!data.playing) {
          return
        }
        // 没标记
        if (!item.label && !item.open) {
          if (item.state === 9) {
            item.end = true // 标识触发点
            failGame()
          } else {
            if (item.state === 0) {
              reactionChain(item.row, item.col)
            } else {
              data.isOpen++
              item.open = true
            }
          }
        }
      }

      // 右键
      function handleMineLabel (item) {
        if (!data.playing) {
          return
        }
        if (!item.open) {
          if (item.label) {
            data.counter++
            item.label = false
          } else if (!item.label && data.counter > 0) {
            data.counter--
            item.label = true
          }
        }
      }

      // 通关条件 (全部打开)
      watch(() => data.isOpen, (value) => {
        console.log(param.row * param.col - param.mine - value)
        if (param.row * param.col - param.mine - value === 0) {
          passGame()
        }
      })

      // 游戏通关
      function passGame () {
        data.playing = false
        setTimeout(() => {
          alert('游戏通关')
        }, 100)
      }

      // 游戏失败
      function failGame () {
        data.playing = false
        data.matrixArr.forEach((rowItem) => {
          rowItem.forEach((colItem) => {
            if (colItem.state === 9) {
              colItem.open = true
            }
          })
        })
        setTimeout(() => {
          alert('游戏失败')
        }, 100)
      }

      // 重置
      function onReset () {
        if (!data.playing) {
          data.matrixArr = createMatrix(param.row, param.col, param.mine)
          data.counter = param.mine
          data.isOpen = 0
          data.playing = true
        }
      }

      return {
        data,
        isStyle,
        handleOpenBulk,
        handleMineLabel,
        onReset
      }
    }
  }
  createApp(App).mount('#app')
}
