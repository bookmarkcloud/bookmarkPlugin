<!--
 * @Author: like like@lepudigital.com
 * @Date: 2022-07-11 17:32:41
 * @LastEditors: like like@lepudigital.com
 * @LastEditTime: 2022-07-22 19:43:51
 * @FilePath: /omnis/src/pages/popup/App.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->

<script setup>
import { ref } from '@vue/reactivity';
import { computed, watch } from '@vue/runtime-core';
const dialogVisible = ref(false)
const search = ref('')
const allTabs = ref([])
const allBookmarks = ref([])
const code = ref('')
const token = ref('')
const qrcodePath = ref('')

qrcodePath.value =  chrome.runtime.getURL('assets/qrcode.png')

chrome.storage.local.get('token', (data) => {
  if (data.token) {
    token.value = data.token
    getTabs()
  } else {
    token.value = ''
  }
})
chrome.storage.local.get('code', (data) => {
  if (data.code) {
    code.value = data.code
  } else {
    code.value = ''
  }
})

chrome.storage.local.onChanged.addListener((changes, areaName) => {
  if (changes.token) {
    token.value = changes.token.newValue
    if (token.value) {
      code.value = ''
    }
  }
  if (changes.code) {
    code.value = changes.code.newValue
  }
})


const tabs = computed(() => {
  return allTabs.value.filter(item => {
    return item.url.includes(search.value) || item.title.includes(search.value)
  })
})

const bookmarks = computed(() => {
  return allBookmarks.value.filter(item => {
    return item.url.includes(search.value) || item.title.includes(search.value)
  })
})


const handleClose = () => {
  dialogVisible.value = false
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'popup-show') {
    dialogVisible.value = true
  }
  sendResponse({status: 'ok'})
})

// 获取tabs
const getTabs = () => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({type: 'get-tabs'}, (response) => {
      allTabs.value = response.tabs
      allBookmarks.value = response.bookmarks
    })
  })
}

// watch dialogVisible.value的变化
watch(dialogVisible, (val) => {
  if (val) {
    getTabs()
  }
})
// 将点击的tab设为激活状态
const handleClick = (tab, type) => {
  if (type === 'bookmark') {
    console.log(tab);
    window.open(tab.url)
  } else {
    chrome.runtime.sendMessage({type: 'set-active-tab', tab: tab}, (response)=> {
      if (response.status === 'ok') {
        handleClose()
      }
    })
  }
  
}

const optionPage = () => {
  // 新窗口打开扩展设置页面
  window.open(chrome.runtime.getURL('html/option.html'))
}

// 收藏
const handleStar = (tab) => {
  chrome.runtime.sendMessage({type: 'star-tab', tab: tab}, (response) => {
    if (response.status === 'ok') {
      getTabs()
    }
  })
}

// 取消收藏
const handleUnStar = (tab) => {
  chrome.runtime.sendMessage({type: 'unstar-tab', tab: tab}, (response) => {
    if (response.status === 'ok') {
      getTabs()
    }
  })
}


</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    width="600px"
    :before-close="handleClose"
    :close-on-click-modal="false"
    :show-close="false"
    custom-class="app-popup-dialog">
    <template #header>
      <div class="app-qrcode-container" v-if="!token">
        <img :src="qrcodePath">
        <div class="app-dialog-code">请扫描二维码登录, 设备验证码{{code}}</div>
      </div>
      <div class="app-search-container">
        <input v-model="search" class="app-search-input"  placeholder="请输入搜索内容" />
        <span class="app-search-enter">Enter</span>
      </div>
    </template>
    <div class="app-dialog-body">
      <div class="app-list">
        <!-- 循环tabs -->
        <div class="app-item" v-for="(tab, index) in tabs" :key="index" @click="handleClick(tab, 'tab')">
          <div class="app-favicon">
            <img v-if="tab.favIconUrl" :src="tab.favIconUrl" width="20">
          </div>
          <div class="app-info" title="跳转">
            <div class="app-title">
              {{tab.title}}
            </div>
            <div class="app-url">
              {{tab.url}}
            </div>
          </div>
          <div class="app-option">
            <span class="app-icon" title="收藏" v-if="tab.star" @click.stop="handleUnStar(tab)">
              <el-icon :size="24" color="#3265cb"><StarFilled /></el-icon>
            </span>
            <span class="app-icon" title="收藏" v-else @click.stop="handleStar(tab)">
              <el-icon :size="24" color="#3265cb"><Star /></el-icon>
            </span>
          </div>
        </div>

        <!-- 循环bookmarks -->

        <div class="app-item" v-for="(bookmark, index) in bookmarks" :key="index+tabs.length" @click="handleClick(bookmark, 'bookmark')">
          <div class="app-favicon">
            <span class="app-icon" title="收藏">
              <el-icon :size="24" color="#3265cb"><StarFilled /></el-icon>
            </span>
          </div>
          <div class="app-info" title="跳转">
            <div class="app-title">
              {{bookmark.title}}
            </div>
            <div class="app-url">
              {{bookmark.url}}
            </div>
          </div>
          <div class="app-option">
            <span class="app-icon" title="收藏" @click.stop="handleUnStar(bookmark)">
              <el-icon :size="24" color="#3265cb"><StarFilled /></el-icon>
            </span>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="app-dialog-footer">
        <span class="app-result-count">Result 200</span>
        <el-button text type="primary" @click="optionPage">option</el-button>
      </div>
    </template>
  </el-dialog>
</template>


<style lang="scss" scoped>
.popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}
.app-qrcode-container {
  height: 120px;
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  img {
    width: 100px;
    height: 100px;
  }
  .app-dialog-code {
    flex: 1;
    font-size: 18px;
    padding-left: 20px;
  }
}
.app-search-container {
  width: 100%;
  height: 42px;
  background-color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
  box-sizing: border-box;
  .app-search-input {
    flex: 1;
    border: none;
    outline: none;
    padding: 9px;
    font-size: 14px;
    line-height: 24px;
    color: #333;
    letter-spacing: 2px;
    height: 100%;
  }
  .app-search-enter {
    user-select: none;
    width: 42px;
    height: 42px;
    line-height: 42px;
    text-align: center;
    font-size: 14px;
    color: #666;
  }
}


.app-dialog-body {
  max-height: 600px;
  overflow-y: auto;
  .app-item {
    height: 60px;
    display: flex;
    padding-left: 15px;
    cursor: pointer;
    border-left: 2px solid transparent;
    margin: 0 1px;

    &:hover {
      background-color: #eff3f9;
      border-color: #6068d2;
    }
    .app-favicon {
      width: 20px;
      height: 20px;
      margin-right: 10px;
      padding-top: 14px;
    }
    .app-info {
      flex: 1;
      height: 42px;
      margin-top: 10px;
      .app-title {
        font-size: 15px;
        color: #333;
        letter-spacing: 2px;
        line-height: 24px;
        overflow: hidden;
        height: 24px;
      }
      .app-url {
        font-size: 12px;
        color: #666;
        letter-spacing: 1px;
        line-height: 18px;
        overflow: hidden;
        height: 18px;
      }
    }
    
    .app-option {
      width: 42px;
      display: flex;
      justify-content: center;
      align-items: center;
      color: #666;
      font-size: 14px;
      letter-spacing: 2px;
      text-align: center;

      .app-icon {
        color: gray;

        &:hover {
          color: rgb(220, 205, 8);
        }
      }
    }
  }
}

.app-dialog-footer {
  width: 100%;
  height: 36px;
  padding: 0 20px;
  text-align: left;
  box-sizing: border-box;
  .app-result-count {
    font-size: 12px;
    color: #666;
    line-height: 36px;
  }
}
</style>

<style lang="scss">
#____body_copy_global#____body_copy_global#____body_copy_global *{
  user-select: auto;
}
#____app * {
  text-align: left;
  box-sizing: border-box;
}
#____app  .app-popup-dialog {
  .el-dialog__header {
    padding: 0;
    margin-right: 0;
  }

  .el-dialog__body {
    border: 1px solid #ebeef5;
    border-width: 1px 0;
    padding: 0;
  }

  .el-dialog__footer {
    padding: 0;
    margin-right: 0;
  }


}

</style>