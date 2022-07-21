/*
 * @Author: like like@lepudigital.com
 * @Date: 2022-07-11 17:09:50
 * @LastEditors: like like@lepudigital.com
 * @LastEditTime: 2022-07-14 19:22:49
 * @FilePath: /omnis/vue.config.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const { defineConfig } = require('@vue/cli-service')

const copyFiles = [
  {
    from: path.resolve("./src/manifest.json"),
    to: `${path.resolve("dist")}/manifest.json`
  },
  {
    from: path.resolve("./src/assets/*"),
    to: `${path.resolve("dist")}/assets/[name].[ext]`
  },
  {
    from: path.resolve("./src/jquery.js"),
    to: `${path.resolve("dist")}/js/jquery.js`
  }
]
const plugins = [
  new CopyWebpackPlugin({
    patterns: copyFiles
  })
]


const pages = {}
const pageNames = ['content', 'newtab', 'option']
pageNames.forEach(pageName => {
  pages[pageName] = {
    entry: `src/pages/${pageName}/main.js`,
    template: `public/index.html`,
    filename: `html/${pageName}.html`
  }
})
const publicPath = process.env.NODE_ENV === 'production' ? 'chrome-extension://llfgmhieafabplkgelamcehkeboobopf/' : '/'
module.exports = defineConfig({
  publicPath,
  pages,
  transpileDependencies: true,
  configureWebpack: {
    entry: {
      background: './src/background.js'
    },
    output: {
      filename: ({runtime})=> {
        if (runtime === 'background') {
          return 'background.js'
        } else {
          return 'js/[name].js'
        }
      },
    },
    plugins,
  },
  css: {
    extract: {
      filename: 'css/[name].css',
    }
  }
})
