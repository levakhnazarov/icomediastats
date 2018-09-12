const cheerio = require('cheerio')
const axios = require('axios')
const logger = require('../logger')()


const countFollowers_ = function (url) {
  return axios.get(url)
    .then((response) => {
      const $ = cheerio.load(response.data)


      const topics = $('.message_number')

      if (topics.length === 0) {
        return -2
      }
      return parseInt($(topics[topics.length - 1]).text().replace(/[^0-9.]/g, ''))
    })
    .catch((error) => {
      logger.error(`Bitcontalk: error occur on getting followers count: \`${url}\`. ${error}`)
      return -2
    })
}

const getPage_ = function (topic) {
  if (topic === '' || topic === null || topic === undefined) { return -1 }

  if (topic.search(/https:\/\/bitcointalk.org\/index.php\?/) !== -1) { topic = topic.split('https://bitcointalk.org/index.php?')[1] }

  if (topic.search(/topic=/) !== -1) { topic = topic.split('topic=')[1] }

  if (topic.search(/./) !== -1) { topic = topic.split('.')[0] }

  if (!isNaN(parseInt(topic))) { topic = parseInt(topic) } else { topic = topic.replace(/\D/g, '') }

  const url = `https://bitcointalk.org/index.php?topic=${topic}.0`

  return axios.get(url)
    .then((response) => {
      const $ = cheerio.load(response.data)


      const table = $('#bodyarea').find('> table')

      if (table.length === 0) {
        return -2
      } else if ($('#bodyarea').find('.prevnext').prev().attr('href') === undefined) {
        return countFollowers_(url)
      }
      return countFollowers_($('#bodyarea').find('.prevnext').prev().attr('href'))
    })
    .catch((error) => {
      logger.error(`Bitcontalk: error occur on getting page: \`${url}\`. ${error}`)
      return -2
    })
}

module.exports = {
  countFollowers: getPage_,
}
