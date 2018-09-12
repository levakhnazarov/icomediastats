const logger = require('../logger')()
const axios = require('axios')


const countFollowers_ = function (pageName) {
  if (pageName === '' || pageName === null || pageName === undefined) { return -1 }

  if (pageName.search(/https:\/\/www.reddit.com\/r\//) !== -1) { pageName = pageName.split('https://www.reddit.com/r/')[1] }

  pageName = pageName.replace(/\//g, '')

  const url = `https://www.reddit.com/r/${pageName}/about.json`

  return axios.get(url)
    .then((response) => {
      if (response.hasOwnProperty('data')
                && response.data.hasOwnProperty('data')
                && !response.data.data.hasOwnProperty('subscribers')) {
        return -3
      }
      return parseInt(response.data.data.subscribers)
    })
    .catch((error) => {
      logger.error(`Reddit: error occur on getting followers count: \`${url}\`. ${error}`)
      return -2
    })
}

module.exports = {
  countFollowers: countFollowers_,
}
