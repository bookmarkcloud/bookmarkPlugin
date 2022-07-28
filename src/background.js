var token = ''
var code = ''
var syncFuncStatus = false

// 从本地获取token 如果没有则启动获取验证码的定时器
chrome.storage.local.get('token', function(result) {
  if (result.token) {
    // 如果有token, 则直接开启同步
    chrome.storage.local.remove('code')
    token = result.token
    openSyncFunction()
  } else {
    createGetCodeTimer()
  }
})

// 监听token的变化, 当token存在时, 关闭获取验证码的定时器, 启动同步定时器
chrome.storage.local.onChanged.addListener(function(changes, areaName) {
  if (changes.token) {
    token = changes.token.newValue
    code = ''
    if (token) {
      chrome.storage.local.remove('code')
      clearGetCodeTimer()
      clearGetTokenTimer()
      openSyncFunction()
    } else {
      closeSyncFunction()
      clearGetTokenTimer()
      createGetCodeTimer()
    }
  }
})


// 创建1分钟定时器, 获取验证码
function createGetCodeTimer() {
  // 先执行一次
  getCode()
  chrome.alarms.create('get-code-timer', {
    delayInMinutes: 1,
    periodInMinutes: 1
  })
}
// 清除1分钟获取验证码的定时器
function clearGetCodeTimer() {
  chrome.alarms.clear('get-code-timer')
}

// 创建每1秒执行一次的定时器, 获取token
function createGetTokenTimer() {
  chrome.alarms.create('get-token-timer', {
    when: Date.now() + 1000,
  })
}
// 清除get-token-timer
function clearGetTokenTimer() {
  chrome.storage.local.remove('code')
  chrome.alarms.clear('get-token-timer')
}


function Request(url, method, data) {
  const baseUrl = "https://api.bookmarkcloud.net"
  url = baseUrl + url
  let headers = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['token'] = token
  }


  if (method === 'GET') {
    if (data) {
      url += '?' + Object.keys(data).map(key => key + '=' + data[key]).join('&')
    }
    return fetch(url, {
      method,
      headers
    }).then(response => response.json())
  } else {
    return fetch(url, {
      method,
      headers,
      body: JSON.stringify(data)
    }).then(response => response.json())
  }
  
}

// 获取设备验证码
function getCodeFn() {
  return Request('/applet/verificationCode', 'GET').then(response => {
    if (response.success) {
      return response.content
    } else {
      return getCodeFn()
    }
  })
}

async function getCode() {
  code = await getCodeFn()
  chrome.storage.local.set({ code })
  createGetTokenTimer()
}
// 获取token
function getToken() {
  return Request('/applet/getToken', 'GET', { code }).then(response => {
    if (response.success && response.content) {
      token = response.content
      clearGetTokenTimer()
      chrome.storage.local.set({ token })
    } else {
      createGetTokenTimer()
    }
  })
}


// 上传更新到服务端
function pushUpdate(diff) {
  return Request('/bookmark/update', "POST", diff)
}


function getBookmarksForCloud() {
  return Request("/bookmark/get", "GET")
}

// 从本地删除书签
function deleteBookmarks(bookmarks) {
  return Promise.all(bookmarks.map(bookmark => {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.remove(bookmark.id, () => {
        resolve(true)
      })
    })
  }))
}

// 批量创建书签
function createBookmarks(bookmarks) {
  return Promise.all(bookmarks.map(bookmark => {
    return new Promise(async (resolve, reject) => {
      let parentItem = await findBookmarkParentIdByPath(bookmark)
      chrome.bookmarks.create({
        title: bookmark.title,
        url: bookmark.url,
        parentId: parentItem?.id || '0'
      }, () => {
        resolve(true)
      })
    })
  }))
}





// 获取所有本地的书签
function getBookmarks() {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getTree(function([{ children }]) {
      resolve(children)
    })
  })
}


// 通过路径查找书签的parentId
function findBookmarkParentIdByPath(bookmark) {
  let _pathArray = JSON.parse(bookmark.path)
  console.log(bookmark.path, _pathArray, bookmark);
  let title = _pathArray?.pop() || ''

  // 获取本地所有书签
  return new Promise((resolve, reject) => {
    getBookmarks().then(bookmarks => {
      // 扁平化
      bookmarks = flattenBookmarks(bookmarks)
      // 将parentId转为pathArray
      bookmarks = convertParentIdToPathArray(bookmarks)
      // 查找书签
      let _bookmark = bookmarks.find(item => {
        return item.title === title &&
                item.path === JSON.stringify(_pathArray)
      })
      resolve(_bookmark)
    })
  })
}


// 将书签树扁平化
/**
 *  bookmarks: [{
 *    title: bookmark.title,
 *    url: bookmark.url,
 *    id: bookmark.id,
 *    parentId: bookmark.parentId
 * }]
 */
function flattenBookmarks(bookmarks) {
  let _bookmarks = []
  bookmarks.forEach(bookmark => {
    if (bookmark.children) {
      _bookmarks.push({
        title: bookmark.title,
        url: bookmark.url || null,
        id: bookmark.id,
        parentId: bookmark.parentId
      })
      _bookmarks = _bookmarks.concat(flattenBookmarks(bookmark.children))
    } else {
      _bookmarks.push({
        title: bookmark.title,
        url: bookmark.url || null,
        id: bookmark.id,
        parentId: bookmark.parentId
      })
    }
  })
  return _bookmarks
}

// 将parentId转为pathArray
function getPathArray(bookmarks, parentId) {
  let pathArray = []
  let parent = bookmarks.find(bookmark => bookmark.id === parentId)
  if (parent) {
    pathArray.unshift(parent.title)
    if (parent.parentId) {
      pathArray = getPathArray(bookmarks, parent.parentId) ? getPathArray(bookmarks, parent.parentId).concat(pathArray) : pathArray
    }
  }
  return pathArray
}
function convertParentIdToPathArray(bookmarks) {
  // 神深拷贝
  let bookmarksCopy = JSON.parse(JSON.stringify(bookmarks))
  let _bookmarks = bookmarks.map(bookmark => {
    let pathArray = getPathArray(bookmarksCopy, bookmark.parentId)
    bookmark.path = JSON.stringify(pathArray)

    // 删除parentId
    delete bookmark.parentId

    return bookmark
  })
  return _bookmarks
}

// 缓存书签数据, 用于修改后diff计算
var bookmarksMemory = []
function cacheBookmarks(bookmarks) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({
      bookmarks: bookmarks
    }, function() {
      console.log('保存书签数据成功')
      bookmarksMemory = bookmarks
      resolve(bookmarks)
    })
  })
}

// diff计算
function diffBookmarks(bookmarks) {
  const delList = []
  const addList = []

  return new Promise((resolve, reject) => {
    // 以title、url、pathArray同时判断是否相同
    bookmarks.forEach(bookmark => {
      let _bookmark = bookmarksMemory.find(item => {
        console.log(bookmark.path, item.path);
        return item.title === bookmark.title &&
                item.url === bookmark.url &&
                item.path === bookmark.path
      })
      if (!_bookmark) {
        addList.push(bookmark)
      }
    })
    bookmarksMemory.forEach(bookmark => {
      let _bookmark = bookmarks.find(item => {
        return item.title === bookmark.title &&
                item.url === bookmark.url &&
                item.path === bookmark.path
      })
      if (!_bookmark) {
        delList.push(bookmark)
      }
    })
    resolve({
      delList,
      addList
    })
  })
}

// 同步书签到云端
function syncBookmarksToCloud() {
  getBookmarks().then(bookmarks => {
    let _bookmarks = flattenBookmarks(bookmarks)
    _bookmarks = convertParentIdToPathArray(_bookmarks)
    diffBookmarks(_bookmarks).then(diff => {
      pushUpdate(diff).then((res) => {
        if (res.success) {
          console.log('同步书签到云端成功')
          console.log('将修改后的书签缓存到本地');
          cacheBookmarks(_bookmarks).then(() => {
            console.log('缓存成功, 准备拉取云端的书签数据')
            syncBookmarksFromCloud()
          })

        }
      })
    })
  })
}


// 将云书签同步到本地
function syncBookmarksFromCloud() {
  getBookmarksForCloud().then(response => {
    if (response.success) {
      console.log('获取云书签成功')
      // 云端书签的path转为pathArray
      let cloudBookmarks = response.content
      // 与本地书签进行diff计算
      diffBookmarks(cloudBookmarks).then(async diff => {
        console.log(diff);
        // 先删除, 再新增, 再更新
        let delList = diff.delList
        let addList = diff.addList
        console.log(diff);
        let result = await Promise.all([
          deleteBookmarks(delList),
          createBookmarks(addList),
        ])
        if (result.every(item => item)) {
          console.log('同步云端书签到本地成功')
          cacheBookmarks(cloudBookmarks).then(() => {
            console.log('本次同步结束')
          })
        }
      })
    }
  })
}




// 当书签发生变化时
function onBookmarksChange(bookmarks) {
  
  
}

// 监听书签变化
chrome.bookmarks.onChanged.addListener(function(id, bookmark) {
  console.log("bookmark changed: " + id);
  onBookmarksChange()
})
// 监听书签创建
chrome.bookmarks.onCreated.addListener(function(id, bookmark) {
  console.log("bookmark created: " + id);
  onBookmarksChange()
})
// 监听书签移除
chrome.bookmarks.onRemoved.addListener(function(id, bookmark) {
  console.log("bookmark removed: " + id);
  onBookmarksChange()
})
// 监听书签移动
chrome.bookmarks.onMoved.addListener(function(id, bookmark) {
  console.log("bookmark move: " + id);
  onBookmarksChange()
})



// 安装时调用
chrome.runtime.onInstalled.addListener(function() {
  // 打开新页面
  // chrome.tabs.create({
  //   url: 'chrome-extension://llfgmhieafabplkgelamcehkeboobopf/html/option.html'
  // })
  // 创建一个新的变量，存储一个空数组
  cacheBookmarks([]).then(bookmarks => {
    console.log("初始化书签数据成功");
    console.log(bookmarks)
  })
})

// 启动时调用
chrome.runtime.onStartup.addListener(function() {
  // 从本地缓存中获取书签数据
  getBookmarks().then(bookmarks => {
    cacheBookmarks(bookmarks).then(() => {
      console.log("启动时缓存书签数据成功");
    })
  })
})


// 创建定时任务, 每5分钟同步一次
function openSyncFunction() {
  if (token)  {
    console.log('开启同步定时任务')
  } else {
    return false
  }
  // 先执行一次
  syncBookmarksToCloud()
  // 启动定时任务
  chrome.alarms.create("sync", {
    delayInMinutes: 5,
    periodInMinutes: 5
  })
}

// 关闭定时任务
function closeSyncFunction() {
  chrome.alarms.clear("sync")
}

// 定时任务执行时调用
chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === "sync") {
    syncBookmarksToCloud()
  }
  if (alarm.name === "get-code-timer") {
    getCode()
  }
  if (alarm.name === "get-token-timer") {
    getToken()
  }
})







// 点击图标事件
chrome.action.onClicked.addListener((tab) => {
  // 向tab发监听息, 显示popup
  chrome.tabs.sendMessage(tab.id, {
    type: 'popup-show'
  }, (response) => {
    
  })
})


// 获取所有打开的标签页, 过滤掉没有url的标签页
function getAllTabs() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({}, (tabs) => {
      let tabsWithUrl = tabs.filter(tab => tab.url)
      const result = {
        tabs: [],
        bookmarks: []
      }
      // 深拷贝bookmarksMemory
      let bookmarksMemoryCopy = JSON.parse(JSON.stringify(bookmarksMemory)).filter(item => item.url)
      // 看这个url是否在书签数据中
      for (let tab of tabsWithUrl) {
        let star = false
        for (let i = 0; i < bookmarksMemoryCopy.length; i++) {
          if (tab.url === bookmarksMemoryCopy[i].url) {
            star = true
            // 从书签数据中删除这个url
            bookmarksMemoryCopy.splice(i, 1)
            break
          }
        }
        result.tabs.push({
          star: star,
          ...tab
        })
      }
      // 将书签中其它的url加入到结果中
      for (let bookmark of bookmarksMemoryCopy) {
        if (!result.tabs.find(item => item.url === bookmark.url)) {
          result.bookmarks.push({
            url: bookmark.url,
            title: bookmark.title
          })
        }
      }
      resolve(result)
    })
  })
}



chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 获取tabs
  if (request.type === 'get-tabs') {
    getAllTabs().then(result => {
      sendResponse(result)
    })
  }

  // 监听设置激活的选项卡
  if (request.type === 'set-active-tab') {
    chrome.tabs.highlight({
      tabs: request.tab.index,
      windowId: request.tab.windowId
    })
    chrome.windows.update(
      request.tab.windowId,
      { focused: true }
    )
    sendResponse({ status: 'ok' })
  }

  // 监听收藏
  if (request.type === 'star-tab') {
    // 添加书签
    chrome.bookmarks.create({
      title: request.tab.title,
      url: request.tab.url
    }, (tab) => {
      console.log('添加书签成功')
      sendResponse({ status: 'ok' })
    })
  }

  // 监听取消收藏
  if (request.type === 'unstar-tab') {
    // 删除书签
    chrome.bookmarks.search({
      title: request.tab.title,
      url: request.tab.url
    }, (tab) => {
      chrome.bookmarks.remove(tab[0].id, () => {
        console.log('删除书签成功')
        sendResponse({ status: 'ok' })
      })
    })
  }
  return true
})