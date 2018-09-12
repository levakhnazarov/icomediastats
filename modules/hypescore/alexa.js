const axios = require('axios')
const awis = require('awis')
const url = require('url')
const logger = require('../logger')()


const client = awis({
  key: process.env.AWSACCESSKEYID,
  secret: process.env.AWSSECRETACCESSKEY,
})


const countRank_ = function (ico) {
  return new Promise(((resolve, reject) => {
    if (ico === '' || ico == null) {
      resolve(-1)
    }
    client({
      Action: 'UrlInfo',
      Url: url.parse(ico).hostname,
      ResponseGroup: 'Related,TrafficData,ContentData',
    }, (err, data) => {
      if (err) {
        resolve(-2)
      } else {
        if (typeof data === 'undefined' || typeof data.trafficData === 'undefined'
                    || !data.trafficData.hasOwnProperty('rank')) {
          resolve(-1)
        }

        if (isNaN(parseInt(data.trafficData.rank))) {
          resolve(-2)
        } else {
          resolve(parseInt(data.trafficData.rank))
        }
      }
    })
  }))
}

const countDayRates_ = function (ico) {
  client({
    Action: 'TrafficHistory',
    Url: url.parse(ico).hostname,
    ResponseGroup: 'History',
    Range: '1',
  }, (err, data) => {
    if (err) {
      console.log(err)
    } else {
      console.log(url.parse(ico).hostname)
      console.log(data.trafficHistory.start)
      console.log(data.trafficHistory.historicalData.data)
      // console.log(data.trafficData.usageStatistics.usageStatistic)
    }
  })
}

module.exports = {
  countRank: countRank_,
  countMonthRates: countDayRates_,
}

