/*
 * @Author: like like@lepudigital.com
 * @Date: 2022-07-11 17:19:24
 * @LastEditors: like like@lepudigital.com
 * @LastEditTime: 2022-07-18 15:54:29
 * @FilePath: /omnis/src/pages/popup/main.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

// 获取当前url
const currentURL = location.href
// 判断是否是localhost
const isLocalhost = () => {
  return currentURL.indexOf('localhost') > -1
}
// 判断是否是chrome://
const isChrome = () => {
  return currentURL.indexOf('chrome://') > -1
}


const $ = process.env.NODE_ENV === 'production' ? window.$ : require('jquery')
const baseURL = chrome.runtime.getURL('/')
const getPath = (url) => {
  return baseURL+url
}



import { createApp } from 'vue'
import App from './App.vue'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import * as ElementPlusIconsVue from '@element-plus/icons-vue'



// 如果不是是localhost或者chrome://, 则执行
if (!isLocalhost() && !isChrome()) {
  $('body').append(`<div id="____app"></div>`)
  // 给body加一个id
  $('body').attr('id', '____body_copy_global')
  const app = createApp(App)
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }
  app.use(ElementPlus)
  app.mount('#____app')
}