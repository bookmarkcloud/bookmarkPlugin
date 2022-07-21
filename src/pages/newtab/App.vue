<!--
 * @Author: like like@lepudigital.com
 * @Date: 2022-07-20 19:56:37
 * @LastEditors: like like@lepudigital.com
 * @LastEditTime: 2022-07-20 20:09:48
 * @FilePath: /omnis/src/pages/newtab/App.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup>
document.title = '新标签页'
const { ref }=require("vue");

const search = ref('')

</script>

<template>
  <div id="new-tab">
    <div class="bg-container">
    </div>
    <input type="text" v-model="search" placeholder="搜索" />

    <div class="change-bg-btn">
      更换壁纸
    </div>
  </div>
</template>
<style lang="scss">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
</style>
<style lang="scss" scoped>
#new-tab {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #fff;
  .bg-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #fff;
    z-index: -1;
  }
  .change-bg-btn {
    position: absolute;
    right: 10px;
    bottom: 10px;
    text-align: center;
    font-size: 12px;
    color: #888;
    padding: 4px 6px;
    cursor: pointer;
    &:hover {
      color: #333;
      background-color: #f5f5f5;
    }
  }
}
</style>