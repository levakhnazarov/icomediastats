'use strict'

const axios = require('axios')


module.exports = () => axios.get('https://poloniex.com/public', {
  params: {
    command: 'returnTicker',
  },
})
  .then((response) => ({
    ETH_BTC: response.data.BTC_ETH.last,
    BTC_USD: response.data.USDT_BTC.last,
    ETH_USD: response.data.USDT_ETH.last,
  }))
  .catch((error) => error)
