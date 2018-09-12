const axios = require('axios')
const util = require('util')
const logger = require('../logger')()


module.exports = (string, website) => {
  if (string === '' || string === null || string === undefined) {
    return -1
  }
  const tokenString = /\((.*)\)/
  const domainString = /\.(\w*)\s/

  string = string.replace(tokenString, '').replace(domainString, '').replace(/\s/, '')

  const url = `https://api.cognitive.microsoft.com/bing/v7.0/search?q=${string}+ico(-site:${website})`

  return axios.get(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.API_BING,
    },
  })
    .then((response) => {
      if (response.data.webPages && response.data.webPages.totalEstimatedMatches) {
        return parseInt(response.data.webPages.totalEstimatedMatches)
      }
      return 0
    })
    .catch((error) => {
      logger.error(`Bing request count error on load page: \`${url}\`. ${error}`)
      return -2
    })
}
