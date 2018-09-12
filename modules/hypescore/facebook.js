const logger = require('../logger')()
const Facebook = require('facebook-node-sdk')


const perBotRequestLimit = 180

const facebookKeys = process.env.FACEBOOK_KEYS.split(' ')
let secretIndex = 0
let apiInstance = false
let requestCount = 0
let retry = 0
const counter = 0
const instance = false


const countFollowers_ = function (originalPageName) {
  requestCount++

  if (originalPageName === '' || originalPageName === null || originalPageName === undefined) { return -1 }
  let pageName = originalPageName.replace(/\//g, '')

  pageName = pageName
    .replaceArray(['https:facebook.com', 'groups', 'https:fb.me', 'https:fb.com', 'https:web.facebook.com',
      'https:business.facebook.com', 'httpswww.facebook.com', 'http:www.facebook.com',
      'https:m.facebook.com', 'http:fb.me'], '')


  return new Promise((resolve, reject) => {
    simpleWaitTransaction(2000)

    // case facebook name contains numeric identifier
    const numericPageName = /-(\d+)/g.exec(pageName)

    if (numericPageName && numericPageName.length > 0) {
      pageName = numericPageName[1]
      // simpleWaitTransaction(2000)
      // logger.info(pageName + " numeric name");

      getApiInstance().api(`/${pageName}/?fields=fan_count`, (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    } else {
      // case facebook name contains 'h' letter
      if (pageName.charAt(0) === 'h') {
        pageName = pageName.substr(1)
        // simpleWaitTransaction(2000);

        // logger.info(pageName + " had 'h' in beginning");

        getApiInstance().api(`/${pageName}/?fields=fan_count`, (err, data) => {
          if (err) {
            reject(err)
          } else {
            resolve(data)
          }
        })
      } else {
        // simple case
        getApiInstance().api(`/${pageName}/?fields=fan_count&debug=all`, (err, data) => {
          if (err) {
            reject(err)
          } else {
            resolve(data)
          }
        })
      }
    }
  }).then((data) => {
    retry = 0
    if (data.fan_count) {
      // logger.info("got "+data.fan_count+" for ", originalPageName);

      return data.fan_count
    }
    return -3
  })
    .catch((err) => {
      if (retry < 2) {
        console.warn(err.message, ' for: ', pageName, ' retry: ', retry)
        // logger.info("got new retry for ", originalPageName, "...",pageName);
        apiInstance = false
        countFollowers_(originalPageName)
        retry++
      } else {
        retry = 0
        logger.error(`Facebook: error occur on getting fan count: \`${pageName}\`. ${err.message}`)
        return -2
      }
    })
}

String.prototype.replaceArray = function (find, replace) {
  let replaceString = this
  let regex

  for (let i = 0; i < find.length; i++) {
    regex = new RegExp(find[i], 'g')
    replaceString = replaceString.replace(regex, replace[i])
  }
  return replaceString
}

function getApiInstance () {
  if (requestCount >= perBotRequestLimit) {
    requestCount = 0
    secretIndex++

    logger.info('index')
    return apiInstance = newApiInstance()
  }
  if (!apiInstance) apiInstance = newApiInstance()
  return apiInstance
}

function newApiInstance () {
  if (facebookKeys[secretIndex] == null) {
    secretIndex = 0
  }
  let secret = facebookKeys[secretIndex]

  secret = secret.split(':')

  let instance = false

  logger.info(`New facebook api instance api: ${secret[0]}secret: ${secret[1]}`)

  instance = new Facebook({ appId: secret[0], secret: secret[1] })


  return instance
}


var simpleWaitTransaction = function (ms) {
  const start = new Date().getTime()


  let end = start

  while (end < start + ms) {
    end = new Date().getTime()
  }
  // console.log("waited ", ms)
}

module.exports = {
  countFollowers: countFollowers_,
}
