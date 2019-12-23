<template>
  <v-app>
    <v-progress-circular
        :size="70"
        :width="7"
        color="purple"
        indeterminate
        style="margin: auto auto"
        v-if="isInit"
    ></v-progress-circular>
    <div :class="actived ? 'activeBackground':'background'" class="content"
         style="width: 100%; height: 100%;position: relative; overflow: hidden;" v-else>
      <div :class="actived ? 'activeContainerPosition' : 'defaultContainerPosition'">
        <div class="font-weight-black font-italic"
             :class="actived ? 'activeTitlePosition title' : 'defaultTitlePosition display-2'">
          MxGraph API 查询
        </div>
        <div :class="actived ? 'activeInputPosition' : 'defaultInputPosition'">
          <v-text-field
              v-model="searchStr"
              solo
              clearable
              @keyup="search"
              :height="actived ? '35' : '50'"
          ></v-text-field>
        </div>
      </div>
      <template v-if="actived">
        <v-menu v-model="filterMenu" :close-on-content-click="false" :nudge-width="200" offset-x>
          <template v-slot:activator="{ on }">
            <v-btn color="info" icon dark v-on="on" style="position: absolute; top: 0; right: 0;">
              <v-icon>
                filter_list
              </v-icon>
            </v-btn>
          </template>
          <v-card>
            <v-card-text>
              <v-layout align-start wrap justify-start row>
                <template v-for="(typeName, index) in Object.keys(resultObjectType)">
                  <v-flex md2 :key="index">
                    <v-checkbox v-model="resultObjectType[typeName]" :label="typeName">
                    </v-checkbox>
                  </v-flex>
                </template>
              </v-layout>
            </v-card-text>
            <v-card-actions>
              <v-spacer/>
              <v-btn small @click="hideAllResult">全取消</v-btn>
              <v-btn small color="primary" @click="showAllResult">全选</v-btn>
            </v-card-actions>
          </v-card>
        </v-menu>
        <hr/>
        <div style="height: calc(100vh - 70px); width: 100%;overflow: auto">
          <div v-if="!searchResult" style="margin: 10% auto; width: 50%; height: 50px; text-align: center">
            <label class="headline">按回车键发起查询</label>
          </div>
          <v-layout align-start wrap justify-start row fill-height>
            <template v-for="(result, index) in searchResult">
              <v-flex v-if="filter(result)"
                      :key="`${result.path}/${result.groupName}/${result.name}/${index}`"
                      @click="showDetail(result)" style="margin: 5px">
                <v-card class="classResult pt-4 mx-auto" v-ripple>
                  <v-card-text>
                    <h3 class="blue--text headline mb-2">
                      {{ result.name }}
                    </h3>
                    <div class="subheading font-weight-bold font-italic">
                      {{ result.itemName }}({{result.groupName.substr(1)}})
                    </div>
                    <div class="subheading font-weight-regular">{{ result.path }}</div>
                  </v-card-text>
                  <v-divider></v-divider>
                  {{result.desc}}
                  <a :href="result.href" target="_blank">查看详情</a>
                </v-card>
              </v-flex>
            </template>
          </v-layout>
        </div>
      </template>
    </div>
    <div v-if="isAdmin" class="adminBtnGroup">
      <v-btn color="primary" fab small dark class="actionBtn" @click="init">
        <v-icon>refresh</v-icon>
      </v-btn>
      <v-btn color="primary" fab small dark class="actionBtn" @click="deleteAllAlgoData">
        <v-icon>close</v-icon>
      </v-btn>
      <v-btn color="primary" fab small dark class="actionBtn" @click="uploadAlgoData">
        <v-icon>cloud_upload</v-icon>
      </v-btn>
      <v-btn color="primary" fab small dark class="actionBtn" @click="showAllAlgoIndices">
        <v-icon>blur_on</v-icon>
      </v-btn>
    </div>
    <v-snackbar v-model="snackbar" :timeout="1000" top :color="snackbarColor">
      {{ snackbarText }}
    </v-snackbar>
  </v-app>
</template>

<script>
import axios from 'axios'
import jsdom from 'jsdom'
import algoliasearch from 'algoliasearch'

export default {
  name: 'home',
  components: {},
  data() {
    return {
      isInit: false,
      baseURL: 'https://jgraph.github.io/mxgraph/docs/js-api/files',
      items: {},
      searchItems: [],
      itemsClassName: ['CVariable', 'CFunction', 'CCookie', 'CEvent'],
      searchStr: '',
      algoClient: null,
      algoIndex: null,
      indexName: 'mxgraph',
      isAdmin: false,
      commandList: {
        switchAdminMode: {
          command: '###admin###',
          message: () => {
            return `${this.isAdmin ? '开启' : '关闭'}管理员模式`
          },
          action: () => {
            this.isAdmin = !this.isAdmin
          }
        },
        switchActiveMode: {
          command: '###active###',
          message: () => {
            return `${this.actived ? '开启' : '关闭'}激活模式`
          },
          action: () => {
            this.actived = !this.actived
          }
        }
      },
      searchResult: null,
      actived: false,
      snackbar: false,
      snackbarText: '',
      snackbarColor: '',
      filterMenu: false,
      resultObjectType: {}
    }
  },
  methods: {
    init() {
      const {JSDOM} = jsdom

      this.isInit = true
      this.items = {}
      this.searchItems = []
      axios.get(`${this.baseURL}/index-txt.html`)
        .then((response) => {
          const {window} = new JSDOM(response.data)

          let tmpMFilesArray = Array.from(window.document.querySelectorAll('.MFile > a'))
          let tmpPromiseArray = []

          tmpMFilesArray.forEach((item) => {
            let tmpLevels = item.href.split('/')

            tmpLevels.splice(tmpLevels.length - 1, 1, item.text)
            let tmpLevelObject = this.items

            for (let tmpIndex = 0; tmpIndex < tmpLevels.length; tmpIndex++) {
              let tmpAttrName = tmpLevels[tmpIndex]

              if (!tmpLevelObject[tmpAttrName]) {

                if (tmpAttrName !== item.text) {
                  tmpLevelObject[tmpAttrName] = {}
                } else {
                  tmpLevelObject[tmpAttrName] = {
                    href: `${this.baseURL}/${item.href}`
                  }
                  tmpPromiseArray.push(axios.get(tmpLevelObject[tmpAttrName].href))
                }
              }
              tmpLevelObject = tmpLevelObject[tmpAttrName]
            }
          })

          return Promise.all(tmpPromiseArray)
        })
        .then((responses) => {
          for (let tmpIndex = 0; tmpIndex < responses.length; tmpIndex++) {
            let tmpRes = responses[tmpIndex]

            const {window} = new JSDOM(tmpRes.data)

            let tmpOriginURL = tmpRes.request.responseURL
            let tmpURL = tmpOriginURL.split(`${this.baseURL}/`)[1]
            let tmpTitle = window.document.querySelector('.CTitle').textContent

            let tmpURLArray = tmpURL.split('/')

            tmpURLArray.pop()
            tmpURLArray.push(tmpTitle)
            tmpURL = tmpURLArray.join('/')
            let tmpItem = this.getItemByPath(tmpURL)

            if (tmpItem) {
              tmpItem.title = tmpTitle
              this.itemsClassName.forEach((name) => {
                let tmpInfoDivs = Array.from(window.document.querySelectorAll(`#Content .${name}`))

                tmpItem[name] = {}
                if (tmpInfoDivs) {
                  tmpInfoDivs.forEach((div) => {
                    let tmpInfoTitle = div.querySelector('.CTitle').textContent
                    let tmpInfoDesc = div.querySelector('.CBody > p')
                    let tmpInfo = tmpItem[name][tmpInfoTitle] = {}

                    tmpInfo.name = tmpInfoTitle
                    tmpInfo.groupName = name
                    tmpInfo.itemName = tmpTitle
                    tmpInfo.path = tmpURL
                    tmpInfo.href = `${tmpOriginURL}#${tmpTitle}.${tmpInfoTitle}`
                    if (tmpInfoDesc) {
                      tmpInfo.desc = tmpInfoDesc.textContent
                      this.searchItems.push(tmpInfo)
                    } else {
                      this.showMessage(`${tmpItem.title}.${tmpInfoTitle} 描述内容为空`, 'error')
                    }
                  })
                }
              })
            } else {
              console.info('err', tmpURL)
            }
            localStorage.setItem('items', JSON.stringify(this.items))
          }
        })
        .catch((e) => {
          console.info(e)
        })
        .finally(() => {
          this.isInit = false

          console.info(this.items)
        })
    },
    getItemByPath(path) {
      let tmpObject = this.items

      path.split('/').forEach((key) => {
        tmpObject = tmpObject[key]
      })
      return tmpObject
    },
    search(evt) {
      if (evt.keyCode === 13) {
        let isCommand = false
        let tmpCommandKeys = Object.keys(this.commandList)

        for (let tmpIndex = 0; tmpIndex < tmpCommandKeys.length; tmpIndex++) {
          let tmpCommand = this.commandList[tmpCommandKeys[tmpIndex]]

          if (tmpCommand.command === this.searchStr) {
            tmpCommand.action()
            isCommand = true
            this.showMessage(tmpCommand.message())
            break
          }
        }
        if (isCommand) {
          return
        }
        this.showMessage('正在搜索，请稍候...')
        this.algoIndex.browse(this.searchStr, (err, {hits} = {}) => {
          if (err) {
            this.showMessage('搜索失败', 'error')
            console.info(err)
            return
          }
          this.showMessage(`搜索完成，共有${hits.length}个结果(search by algolia)`, 'success')
          this.searchResult = hits

          console.info()
        })
      }
    },
    showAllAlgoIndices() {
      this.algoClient.listIndexes((err, content) => {
        if (err) {
          this.showMessage('查看所有目录失败', 'error')
          console.info(err)
          return
        }
        this.showMessage('查看所有目录成功', 'success')
        console.log(content)
      })
    },
    deleteAllAlgoData() {
      this.algoClient.deleteIndex(this.indexName, (err) => {
        if (err) {
          this.showMessage(`删除${this.indexName}目录失败`, 'error')
          console.info(err)
          return
        }
        this.showMessage(`删除${this.indexName}目录成功`, 'success')
      })
    },
    uploadAlgoData() {
      this.algoIndex.addObjects(this.searchItems, (err) => {
        if (err) {
          this.showMessage(`上传${this.indexName}目录失败`, 'error')
          console.error(err)
          return
        }
        this.showMessage(`上传${this.indexName}目录成功`, 'success')
      })
    },
    showDetail(itemInfo) {
      console.info(itemInfo)
    },
    showMessage(message, mode = 'info') {
      this.snackbarColor = mode
      this.snackbarText = message
      this.snackbar = true
    },
    filter(itemInfo) {
      return this.resultObjectType[itemInfo.itemName]
    },
    hideAllResult() {
      Object.keys(this.resultObjectType).forEach((key) => {
        this.resultObjectType[key] = false
      })
    },
    showAllResult() {
      Object.keys(this.resultObjectType).forEach((key) => {
        this.resultObjectType[key] = true
      })
    }
  },
  watch: {
    searchStr() {
      this.actived = this.searchStr
      if (!this.searchStr) {
        this.searchResult = []
      }
    },
    searchResult() {
      if (!this.searchResult) {
        this.resultObjectType = {}
      }
      let tmpArray = Array.from(new Set(this.searchResult.map((item) => {
        return item.itemName
      })))
      let tmpType = {}

      tmpArray = tmpArray.sort()
      tmpArray.forEach((tmpTypeName) => {
        tmpType[tmpTypeName] = true
      })
      this.resultObjectType = tmpType
    }
  },
  mounted() {
    const env = process.env
    const algoUUID = env['VUE_APP_ALGO_UUID']
    const algoToken = env['VUE_APP_ALGO_TOKEN']

    if (!algoUUID || !algoToken) {
      console.info(env)
      alert('need algo uuid and token')
      return
    }
    this.algoClient = algoliasearch(algoUUID, algoToken)
    this.algoIndex = this.algoClient.initIndex(this.indexName)
  }
}
</script>

<style>
.actionBtn {
  opacity: .5;
}

.actionBtn:hover {
  opacity: 1;
}

.content:after {
  content: "";
  display: inline-block;
  height: 100%;
  vertical-align: middle;
}

.classResult {
  transition: all .2s;
  cursor: pointer;
  text-align: center;
}

.classResult:hover {
  /*background: #c0d1c7;*/
}

.background {
  background-color: #bbb;
  background-image: url('./background.jpg');
  background-size: cover;
}

.defaultContainerPosition {
  width: 45%;
  height: 20%;
  margin: 15% auto;
}

.activeContainerPosition {
  width: 1000px;
  height: 37px;
  margin: 5px 0;
}

.defaultInputPosition, .defaultTitlePosition {
  text-align: center;
  height: 50%;
  width: 100%;
}

.activeTitlePosition {
  text-align: center;
  display: inline-block;
  height: 100%;
  width: 200px;
}

.activeInputPosition {
  text-align: center;
  display: inline-block;
  height: 100%;
  width: 500px;
}

.activeBackground {
  background-color: #f5f5f5;
}

.v-text-field.v-text-field--solo .v-input__control {
  min-height: 30px;
}

.adminBtnGroup {
  position: absolute;
  background: none;
  bottom: 0;
  left: 0;
}
</style>
