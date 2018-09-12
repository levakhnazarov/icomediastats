'use strict'

const logger = require('../logger')()
const axios = require('axios')
const models = require('../../models')


const getAPIdata_ = (address, offset) => axios.get(`https://blockchain.info/rawaddr/${address}`, {
  params: {
    sort: 1,
    limit: 50,
    offset,
  },
})
  .then((response) => response.data)
  .catch((error) => {
    logger.error(`Could not get data from API etherscan. ${error}`)
    return { error: true }
  })


/**
 * Update transactions based on previous results
 *
 * @param address - wallet address
 * @param last_block - number of last transaction saved in `transaction_base` table
 * @param total_value - sum of IN transactions
 * @param current_value - sum of IN and OUT transactions
 */
module.exports = async (address, last_block, total_value, current_value) => {
  let data = null


  let getBlocks = null


  let block = null


  let getTransactions = null


  let transaction = null


  let insertArray = null


  let value = 0

  while (true) {
    data = await getAPIdata_(address, last_block)

    if (data.error) { break }

    insertArray = []
    getBlocks = data.txs

    last_block += getBlocks.length

    while (getBlocks.length !== 0) {
      block = getBlocks.shift()

      getTransactions = block.inputs

      while (getTransactions.length !== 0) {
        transaction = getTransactions.shift().prev_out
        value = parseFloat(transaction.value) / 100000000

        if (value !== 0) {
          // IN transaction
          if (transaction.addr.toUpperCase() !== address.toUpperCase()) {
            total_value += value
            current_value += value

            insertArray.push({
              address,
              hash: block.hash,
              timestamp: block.time,
              from: transaction.addr,
              to: address,
              value,
            })
          }
        }
      }

      getTransactions = block.out

      while (getTransactions.length !== 0) {
        transaction = getTransactions.shift()
        value = parseFloat(transaction.value) / 100000000

        if (value !== 0) {
          // OUT transaction
          if (transaction.addr.toUpperCase() !== address.toUpperCase()) {
            current_value -= value

            insertArray.push({
              address,
              hash: block.hash,
              timestamp: block.time,
              from: address,
              to: transaction.addr,
              value,
            })
          }
        }
      }
    }

    await models.transaction_btc.bulkCreate(insertArray)

    if (data.n_tx === last_block) {
      break
    }
  }

  return {
    last_block,
    total_value: data.total_received / 100000000,
    current_value: data.final_balance / 100000000,
  }
}
