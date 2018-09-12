'use strict'

const logger = require('../logger')()
const axios = require('axios')
const models = require('../../models')


const getAPIdata_ = (address, block) => axios.get('https://api.etherscan.io/api', {
  params: {
    module: 'account',
    action: 'txlist',
    address,
    sort: 'asc',
    startblock: ++block,
    endblock: 99999999,
    apikey: process.env.API_ETHERSCAN,
  },
})
  .then((response) => response.data)
  .catch((error) => {
    logger.error(`Could not get data from API etherscan. ${error}`)
    return { status: 0 }
  })


/**
 * Update transactions based on previous results
 *
 * @param address - wallet address
 * @param last_block - number of last transaction saved in `transaction_etn` table
 * @param total_value - sum of IN transactions
 * @param current_value - sum of IN and OUT transactions
 */
module.exports = async (address, last_block, total_value, current_value) => {
  let data = null


  let getTransactions = null


  let getTransactionsLength = 0


  let insertArray = null


  let current = null


  let value = 0

  while (true) {
    data = await getAPIdata_(address, last_block)
    getTransactions = data.result
    getTransactionsLength = getTransactions.length
    insertArray = []
    current = {}

    if (data.status === 0) { break }

    while (getTransactions.length !== 0) {
      current = getTransactions.shift()
      last_block = current.blockNumber

      value = parseFloat(current.value) / 1000000000000000000

      // if (parseInt(current.isError) !== 1 && value !== 0) { // if not include transactions with value=0
      if (parseInt(current.isError) !== 1) {
        // IN transaction
        if (current.to.toUpperCase() === address.toUpperCase()) {
          total_value += value
          current_value += value
        }
        // OUT transaction
        else if (current.from.toUpperCase() === address.toUpperCase()) {
          current_value -= value
        }

        insertArray.push({
          address,
          hash: current.hash,
          timestamp: current.timeStamp,
          from: current.from,
          to: current.to,
          value,
        })
      }
    }

    await models.transaction_eth.bulkCreate(insertArray)

    if (getTransactionsLength !== 10000) {
      break
    }
  }

  return {
    last_block,
    total_value,
    current_value,
  }
}
