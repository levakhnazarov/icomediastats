const logger = require('../logger')()
const axios = require('axios')


const countFollowers_ = function (pageName) {
  if (pageName === '' || pageName === null || pageName === undefined) { return -1 }

  if (pageName.search(/https:\/\/medium.com\/@/) !== -1) { pageName = pageName.split('https://medium.com/')[1] }

  pageName = pageName.replace(/\//g, '')

  const url = `https://medium.com/${pageName}/?format=json`

  return axios.get(url)
    .then((response) => {
      if (response.data.hasOwnProperty('success') && response.data.success === false) {
        if (response.data.error.search('blacklisted') !== -1) {
          return -4
        }
        if (response.data.error.search('deactivated') !== -1) {
          return -5
        }
      }

      const data = JSON.parse(response.data.substring(response.data.search('{'), response.data.length))


      const userId = data.payload.user.userId

      return parseInt(data.payload.references.SocialStats[userId].usersFollowedByCount)
    })
    .catch((error) => {
      logger.error(`Medium: error occur on getting followers count: \`${url}\`. ${error}`)
      return -2
    })
}

module.exports = {
  countFollowers: countFollowers_,
}

