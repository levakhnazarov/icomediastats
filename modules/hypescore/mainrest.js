const logger = require('../logger')()
const axios = require('axios')


module.exports = (name) => {
  if (name === '' || name === null || name === undefined) {
    return -1
  }

  const tokenString = /\((.*)\)/
  const domainString = /\.(\w*)\s/

  name = name.replace(tokenString, '').replace(domainString, '').replace(/\s/, '')

  const url = `https://api.ventanalytics.ru/mainrest/keywords?login=${process.env.MAINREST_GROUP}&word=${name}`

  return axios.get(url)
    .then((response) => parseInt(response.data.data))
    .catch((error) => {
      logger.error(`Mainrest: could not load page: \`${url}\`. ${error}`)
      return -2
    })
}
