/*
 * @Author: like like@lepudigital.com
 * @Date: 2022-07-11 17:09:50
 * @LastEditors: like like@lepudigital.com
 * @LastEditTime: 2022-07-14 12:11:55
 * @FilePath: /omnis/src/main.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { createApp } from 'vue'
import App from './App.vue'


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  sendResponse({status: 'success'})
})
createApp(App).mount('#app')
