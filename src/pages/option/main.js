/*
 * @Author: like like@lepudigital.com
 * @Date: 2022-07-14 19:06:24
 * @LastEditors: like like@lepudigital.com
 * @LastEditTime: 2022-07-14 19:08:23
 * @FilePath: /omnis/src/pages/option/main.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */


import { createApp } from 'vue'
import App from './App.vue'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import * as ElementPlusIconsVue from '@element-plus/icons-vue'


const app = createApp(App)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
app.use(ElementPlus)
app.mount('#____app')