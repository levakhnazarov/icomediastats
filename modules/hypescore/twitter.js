const logger = require('../logger')()
const axios = require('axios')


const countFollowers_ = function (pageName) {
  if (pageName === '' || pageName === null || pageName === undefined) { return -1 }

  if (pageName.search(/https:\/\/twitter.com\//) !== -1) { pageName = pageName.split('https://twitter.com/')[1] }

  pageName = pageName.replace(/\//g, '')

  const url = `https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=${pageName}`

  return axios.get(url)
    .then((response) => parseInt(response.data[0].followers_count))
    .catch((error) => {
      logger.error(`Twitter: error occur on getting followers count: \`${url}\`. ${error}`)
      return -2
    })
}

module.exports = {
  countFollowers: countFollowers_,
}
