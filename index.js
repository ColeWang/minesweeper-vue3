window.onload = () => {
  const { reactive, createApp, watch } = Vue

  function initMatrix (rowMax, colMax) {
    return Array.apply(null, Array(rowMax)).map((item, row) => {
      return Array.apply(null, Array(colMax)).map((item, col) => {
        return { row: row, col: col, state: 0, open: false, label: false }
      })
    })
  }

  function filter (row, col, rowMax, colMax, func) {
    const posArr = [[row - 1, col], [row - 1, col - 1], [row - 1, col + 1], [row, col - 1], [row, col + 1], [row + 1, col + 1], [row + 1, col - 1], [row + 1, col]]
    for (let i = 0; i < 8; i++) {
      const _row = posArr[i][0]
      const _col = posArr[i][1]
      if (_row < 0 || _col < 0 || _row > rowMax - 1 || _col > colMax - 1) {
        continue
      }
      func && func({
        row: _row,
        col: _col
      })
    }
  }

  // 雷周围数字
  function getLatticeIndex (matrix, rowMax, colMax) {
    for (let row = 0; row < rowMax; row++) {
      for (let col = 0; col < colMax; col++) {
        const curContent = matrix[row][col]
        if (curContent && curContent.state === 9) {
          continue
        }
        let mineNum = 0
        filter(row, col, rowMax, colMax, (res) => {
          const curPos = matrix[res.row][res.col]
          if (curPos && curPos.state === 9) {
            mineNum += 1
          }
          matrix[row][col].state = mineNum
        })
      }
    }
    return matrix
  }

  // 生成二维矩阵
  function createMatrix (rowMax, colMax, mine) {
    let count = 0
    const matrix = initMatrix(rowMax, colMax)
    // 生成随机数
    while (count < mine) {
      const putRow = Math.floor(Math.random() * rowMax)
      const putCol = Math.floor(Math.random() * colMax)
      if (matrix[putRow][putCol].state !== 9) {
        count += 1
        matrix[putRow][putCol].state = 9
      }
    }
    return getLatticeIndex(matrix, rowMax, colMax)
  }

  const App = {
    template: `<div class="box">
                 <div class="top">
                   <div class="playing" :class="{'fail': !data.playing}" @click="onReset"></div>
                   <div class="counter">{{data.counter > 9 ? '0' + data.counter : '00'+ data.counter}}</div>
                 </div>
                 <div class="wicket">
                   <div class="row" v-for="(rowItem, row) in data.matrix">
                     <div class="col"
                          :class="isStyle(colItem)"
                          @dblclick.prevent="handleDBlClick(colItem)"
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
        rowMax: 16, // 行
        colMax: 30, // 列
        mine: 99, // 地雷
      }

      const data = reactive({
        matrix: createMatrix(param.rowMax, param.colMax, param.mine),
        counter: param.mine, // 剩余标记数
        isOpen: 0, // 计数打开数量 open
        playing: true
      })

      function isStyle (item) {
        const end = item.end && !!item.end // 触发点标识
        const open = !item.open && !item.label && 'open'
        const label = item.label && 'a10'
        return end ? 'end' : `a${item.state} ${open || label}`
      }

      function reactionChain (row, col) {
        const { rowMax, colMax } = param
        if (row < 0 || col < 0 || row > rowMax - 1 || col > colMax - 1) {
          return
        }
        const curPos = data.matrix[row][col]
        if (curPos.open || curPos.label) {
          return
        }
        data.isOpen += 1
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
            reactionChain(item.row, item.col)
          }
        }
      }

      function getLabels (item) {
        const { rowMax, colMax } = param
        const { row, col } = item
        let result = 0
        filter(row, col, rowMax, colMax, (res) => {
          const curPos = data.matrix[res.row][res.col]
          if (curPos && curPos.label) {
            result += 1
          }
        })
        return result
      }

      // 双击
      function handleDBlClick (item) {
        if (!data.playing) {
          return
        }
        if (item.open && (item.state !== 9 && item.state !== 0)) {
          if (item.state === getLabels(item)) {
            const { rowMax, colMax } = param
            const { row, col } = item
            try {
              filter(row, col, rowMax, colMax, (res) => {
                const curPos = data.matrix[res.row][res.col]
                if (curPos && !curPos.label && !curPos.open) {
                  if (curPos.state === 9) {
                    curPos.end = true
                    throw new Error('err')
                  } else {
                    reactionChain(curPos.row, curPos.col)
                  }
                }
              })
            } catch (e) {
              failGame()
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
            data.counter += 1
            item.label = false
          } else if (!item.label && data.counter > 0) {
            data.counter -= 1
            item.label = true
          }
        }
      }

      // 通关条件 (全部打开)
      watch(() => data.isOpen, (value) => {
        if (param.rowMax * param.colMax - param.mine - value === 0) {
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
        data.matrix.forEach((rowItem) => {
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
        data.matrix = createMatrix(param.rowMax, param.colMax, param.mine)
        data.counter = param.mine
        data.isOpen = 0
        data.playing = true
      }

      return {
        data,
        isStyle,
        handleOpenBulk,
        handleDBlClick,
        handleMineLabel,
        onReset
      }
    }
  }
  createApp(App).mount('#app')
}
