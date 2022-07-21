var token = ''
var syncFuncStatus = false
chrome.storage.local.get('openId', function(result) {
  if (result.openId) {
    token = result.openId
  }
})
chrome.storage.local.get('syncFuncStatus', function(result) {
  if (result.syncFuncStatus) {
    syncFuncStatus = result.syncFuncStatus
    openSyncFunction()
  }
})

// 监听syncFuncStatus的变化
chrome.storage.local.onChanged.addListener(function(changes, areaName) {
  if (changes.syncFuncStatus) {
    syncFuncStatus = changes.syncFuncStatus.newValue
    if (syncFuncStatus) {
      openSyncFunction()
    } else {
      closeSyncFunction()
    }
  }
})



function Request(url, method, data) {
  const baseUrl = "http://192.168.34.152:3000/api/bookmark"
  url = baseUrl + url
  return new Promise((resolve, reject) => {
    fetch(url, {
      method: method,
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        token: token
      }
    }).then(response => response.json())
    .then(response => {
      resolve(response)
    }).catch(error => {
      reject(error)
    })
  })
}

function addBookmarksToCloud(_bookmarks) {
  return Request("/addBookmarkList", "POST", {
    bookmarkList: _bookmarks
  })
}

function updateBookmarksToCloud(_bookmarks) {
  return Request("/updateBookmarkList", "POST", {
    bookmarkList: _bookmarks
  })
}

function deleteBookmarksToCloud(_bookmarks) {
  return Request("/deleteBookmarkList", "POST", {
    bookmarkList: _bookmarks
  })
}


function getBookmarksForCloud() {
  return Request("/getBookmarks", "GET")
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

// 批量更新本地书签
function updateBookmarks(bookmarks) {
  return Promise.all(bookmarks.map(bookmark => {
    return new Promise(async (resolve, reject) => {
      let parentItem = await findBookmarkParentIdByPath(bookmark)
      chrome.bookmarks.update(bookmark.id, {
        title: bookmark.title,
        url: bookmark.url,
        parentId: parentItem.id
      }, () => {
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
        parentId: parentItem.id
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
  let title = bookmark.pathArray.pop()

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
                JSON.stringify(item.pathArray) === JSON.stringify(bookmark.pathArray)
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
    bookmark.pathArray = getPathArray(bookmarksCopy, bookmark.parentId)

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
  const updateList = []

  return new Promise((resolve, reject) => {
    // 以title查找新增的书签
    bookmarks.forEach(bookmark => {
      const oldBookmark = bookmarksMemory.find(oldBookmark => oldBookmark.title === bookmark.title)
      if (!oldBookmark) {
        addList.push(bookmark)
      } else {
        // 如果书签的url发生变化, 则认为是更新
        if (oldBookmark.url !== bookmark.url) {
          updateList.push(bookmark)
        } else {
          // 如果书签的path发生变化, 则认为是更新
          if (oldBookmark.pathArray?.toString() !== bookmark.pathArray?.toString()) {
            updateList.push(bookmark)
          }
        }
      }
    })

    // 以title查找删除的书签
    bookmarksMemory.forEach(bookmark => {
      const newBookmark = bookmarks.find(newBookmark => newBookmark.title === bookmark.title)
      if (!newBookmark) {
        delList.push(bookmark)
      }
    })
    resolve({
      delList,
      addList,
      updateList
    })
  })
}

// 同步书签到云端
function syncBookmarksToCloud() {
  getBookmarks().then(bookmarks => {
    let _bookmarks = flattenBookmarks(bookmarks)
    _bookmarks = convertParentIdToPathArray(_bookmarks)
    diffBookmarks(_bookmarks).then(diff => {
      Promise.all([
        addBookmarksToCloud(diff.addList),
        updateBookmarksToCloud(diff.updateList),
        deleteBookmarksToCloud(diff.delList)
      ]).then((res) => {
        if (res.every(item => item.code === 200)) {
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
    if (response.code === 200) {
      console.log('获取云书签成功')
      // 云端书签的path转为pathArray
      let cloudBookmarks = response.data.map(bookmark => {
        bookmark.pathArray = JSON.parse(bookmark.path)
        delete bookmark.path
        return bookmark
      })
      // 与本地书签进行diff计算
      diffBookmarks(cloudBookmarks).then(async diff => {
        console.log(diff);
        // 先删除, 再新增, 再更新
        let delList = diff.delList
        let addList = diff.addList
        let updateList = diff.updateList
        let result = await Promise.all([
          deleteBookmarks(delList),
          createBookmarks(addList),
          updateBookmarks(updateList)
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



// 开启同步
function startSync() {
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
  if (syncFuncStatus && token)  {
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
})






// 点击图标事件
chrome.action.onClicked.addListener((tab) => {
  // 向tab发监听息, 显示popup
  chrome.tabs.sendMessage(tab.id, {
    type: 'popup-show'
  }, (response) => {
    
  })
})


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 获取tabs
  if (request.type === 'get-tabs') {
    chrome.tabs.query({}, (_tabs) => {
      const tabs = _tabs.filter((tab) => {
        return tab.url.indexOf('http') === 0
      })
      sendResponse({
        tabs
      })
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
  return true
})