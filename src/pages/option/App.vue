<!--
 * @Author: like like@lepudigital.com
 * @Date: 2022-07-14 19:06:42
 * @LastEditors: like like@lepudigital.com
 * @LastEditTime: 2022-07-21 21:52:22
 * @FilePath: /omnis/src/pages/option/App.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup>
const { ref }=require("@vue/reactivity");
const $ =  require('jquery')
import { ElMessage } from 'element-plus'
import { watch } from 'vue-demi';
const syncFuncStatus = ref(false)
const globalCopyFn = ref(false)
const newtabFn = ref(false)

// openId 登录状态
const openId = ref('')

chrome.storage.local.get('openId', (data) => {
  if (data.openId) {
    openId.value = data.openId
  }
})

chrome.storage.local.get('syncFuncStatus', (data) => {
  if (data.syncFuncStatus && openId.value) {
    syncFuncStatus.value = data.syncFuncStatus
  }
})


chrome.storage.local.get('globalCopyFn', (data) => {
  if (data.globalCopyFn) {
    globalCopyFn.value = data.globalCopyFn
  }
})


chrome.storage.local.get('newtabFn', (data) => {
  if (data.newtabFn) {
    newtabFn.value = data.newtabFn
  }
})

watch(openId, (val) => {
  chrome.storage.local.set({
    openId: val
  })
})
watch(syncFuncStatus, (val) => {
  chrome.storage.local.set({
    syncFuncStatus: val
  })
})
watch(globalCopyFn, (val) => {
  chrome.storage.local.set({
    globalCopyFn: val
  })
})
watch(newtabFn, (val) => {
  chrome.storage.local.set({
    newtabFn: val
  })
})


// 登录弹窗展示状态
const loginDialogVisible = ref(false)

// 验证码
const verificationCode = ref('')

const updateSyncFnStatus = (value) => {
  if (!openId.value && value) {
    syncFuncStatus.value = false
    ElMessage.warning({
      message: '此功能需要先进行登录',
      duration: 2000
    })
  }
}

var getOpenIdTimer = null
var getVerificationCodeTimer = null

const getOpenIdFn = (code) => {
  return new Promise((resolve)=> {
    $.ajax({
      url: 'http://192.168.34.152:3000/api/user/getToken',
      type: 'GET',
      dataType: 'json',
      data: {
        code
      },
      success: (response) => {
        if (response.code === 200 && response.data?.token) {
          resolve(response.data.token)
        } else {
          resolve(false)
        }
      }
    })
  })
}

const getOpenId = (code) => {
  return new Promise((resolve)=> {
    getOpenIdFn(code).then((response) => {
      if (response) {
        resolve(response)
      } else {
        getOpenIdTimer = setTimeout(() => {
          getOpenId(code).then((response) => {
            resolve(response)
          })
        }, 1000)
      }
    })
  })
}

const showLoginModel = () => {
  clearTimeout(getOpenIdTimer)
  loginDialogVisible.value = true
  // 请求获取验证码
  $.ajax({
    url: 'http://192.168.34.152:3000/api/user/getVerificationCode',
    type: 'GET',
    dataType: 'json',
    success: (response) => {
      if (response.code === 200) {
        verificationCode.value = response.data.code + ''
        getOpenId(response.data.code+'').then((res)=> {
          if (res) {
            loginDialogVisible.value = false
            openId.value = res
            chrome.storage.local.set({
              openId: res
            })
          }
        })


        clearTimeout(getOpenIdTimer)
        clearTimeout(getVerificationCodeTimer)

        getVerificationCodeTimer = setTimeout(() => {
          clearTimeout(getOpenIdTimer)
          if (loginDialogVisible.value) {
            showLoginModel()
          }
        }, 60000)
      }
    }
  })
}

const hideLoginModel = () => {
  clearTimeout(getOpenIdTimer)
  clearTimeout(getVerificationCodeTimer)
  loginDialogVisible.value = false
}


// 退出登录
const logout = () => {
  openId.value = ''
  syncFuncStatus.value = false
  chrome.storage.local.set({
    openId: ''
  })
  chrome.storage.local.set({
    syncFuncStatus: false
  })
}


</script>
<template>
  <div id="____app-option" class="app-option-container">
    <div class="section">
      <div class="section-title">
        <span>设置</span>
      </div>
      <div class="section-content">
        <!-- 头像和id -->
        <template v-if="openId">
        <div class="avatar-container">
          <div class="avatar">
            <img src="https://avatars0.githubusercontent.com/u/18098981?s=460&v=4" alt="">
          </div>
          <div class="userinfo">
            <div class="nickname">微信用户</div>
            <div class="wxid">wxid: {{openId}}</div>
          </div>
          <div class="update-account">
            <el-button text plain bg @click="logout">退出</el-button>
          </div>
        </div>
        </template>
        <template v-else>
        <div class="avatar-container">
          <div class="avatar">
            <img src="https://avatars0.githubusercontent.com/u/18098981?s=460&v=4" alt="">
          </div>
          <div class="userinfo">
            <div class="nickname">未登录</div>
            <div class="wxid">wxid: - </div>
          </div>
          <div class="update-account">
            <el-button text plain bg @click="showLoginModel">登录</el-button>
          </div>
        </div>
        </template>
        <!-- 其它设置选项 -->
        <div class="option-item">
          <div class="option-label">
            同步功能
          </div>
          <div class="option-value">
            <el-switch v-model="syncFuncStatus" @change="updateSyncFnStatus"></el-switch>
          </div>
        </div>

        <div class="option-item">
          <div class="option-label">
            全局复制
          </div>
          <div class="option-value">
            <el-switch v-model="globalCopyFn"></el-switch>
          </div>
        </div>

        <div class="option-item">
          <div class="option-label">
            标签页推荐
          </div>
          <div class="option-value">
            <el-switch v-model="newtabFn"></el-switch>
          </div>
        </div>
      </div>
    </div>
    <!-- 扫码登录弹窗 -->
    <el-dialog title="登录" v-model="loginDialogVisible" width="320px" :close-on-click-modal="false" :close-on-press-escape="false" @close="hideLoginModel" class="login-dialog">
      <div class="login-qrcode">
        <img src="/assets/qrcode.png" alt="">
      </div>
      <div class="login-tips">
        <div class="tip-code">
          设备验证码: 
          <span v-for="(t, i) in verificationCode" :key="i">{{t}}</span>
        </div>
        <div class="tips-title">
          请打开微信扫码登录
        </div>
      </div>
    </el-dialog>


  </div>
</template>

<style lang="scss" scoped>

#____app-option.app-option-container {
  width: 680px;
  height: 100%;
  margin: 0 auto;
  padding: 20px 0;
  .section {
    margin-bottom: 15px;

    .section-title {
      font-size: 18px;
      line-height: 28px;
      margin-bottom: 12px;
    }

    .section-content {
      background: #fff;
      border-radius: 5px;
      box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12), 0 3px 1px -2px rgba(0, 0, 0, 0.2);
      .avatar-container {
        display: flex;
        align-items: center;
        height: 60px;
        padding: 0 20px;
        .avatar {
          width: 60px;
          height: 60px;
          padding: 10px;
          img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            overflow: hidden;
          }
        }
        .userinfo {
          padding: 10px;
          font-size: 16px;
          line-height: 22px;
          flex: 1;
          .wxid {
            color: #999;
            line-height: 18px;
            font-size: 14px;
          }
        }
      }
      .option-item {
        display: flex;
        width: 640px;
        margin: 0 auto;
        padding: 12px 0;
        border-top: 1px solid #eee;
        line-height: 24px;
        height: 48px;
        font-size: 14px;

        .option-label {
          flex: 1;
          text-align: left;
        }
        .option-value {
          flex: 1;
          text-align: right;
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
      }
    }
  }

  .login-qrcode {
    width: 100%;
    height: 240px;
    text-align: center;
    img {
      width: 240px;
      height: 240px;
    }
  }
  .login-tips {
    padding: 20px;
    font-size: 14px;
    line-height: 24px;
    .tips-title {
      font-size: 18px;
      line-height: 22px;
      text-align: center;
      padding-top: 20px;
    }
    .tip-code {
      height: 28px;
      line-height: 28px;
      text-align: center;
      font-size: 18px;
      font-weight: 600;
      span {
        border: 1px solid #888;
        width: 28px;
        height: 28px;
        display: inline-block;
        font-weight: 900;
        text-align: center;
        line-height: 26px;
        border-right: none;
        font-size: 20px;
        color: #000;
        &:last-child {
          border-right: 1px solid #888;
        }
      }
    }
  }
}

</style>

<style lang="scss">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
#____app {
  width: 100%;
  height: 100%;
}
</style>