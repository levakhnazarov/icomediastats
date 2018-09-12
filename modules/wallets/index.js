const logger = require('../logger')()
const models = require('../../models')
const getCourseFromPoloniex = require('./poloniex')
const updateTransactionsBTC = require('./blockchain')
const updateTransactionsETH = require('./etherscan')


let wallets = null


let projects = null


let course = null

/**
 * Update list of transactions based on wallet
 *
 * @param wallet - item from `people_wallet` table
 * @private
 */
const updateTransactions_ = async (wallet) => {
  let data = null

  switch (wallet.getDataValue('type')) {
    case 'eth':
      data = await updateTransactionsETH(
        wallet.getDataValue('address'),
        wallet.getDataValue('last_block'),
        wallet.getDataValue('total_value'),
        wallet.getDataValue('current_value'),
      )
        .catch((error) => {
          logger.error(`Error occur in updating etherum transactions. Address: \`${wallet.getDataValue('address')}\`. ${error}`)
        })
      break
    case 'btc':
      data = await updateTransactionsBTC(
        wallet.getDataValue('address'),
        wallet.getDataValue('last_block'),
        wallet.getDataValue('total_value'),
        wallet.getDataValue('current_value'),
      )
        .catch((error) => {
          logger.error(`Error occur in updating bitcoin transactions. Address: \`${wallet.getDataValue('address')}\`. ${error}`)
        })
      break
  }

  if (data) {
    wallet = await wallet.updateAttributes(data)
  }

  return wallet
}


/**
 * Get all items from `project_wallet` table
 *
 * @returns {Promise}
 * @private
 */
const getAllWallets_ = () => models.project_wallet.findAll()
  .then((wallets) => wallets)
  .catch((error) => {
    logger.error(`Could not get items from \`project_wallet\` table. ${error}`)
    return []
  })


/**
 * Get all items from `projects` table
 *
 * @returns {Promise}
 * @private
 */
const getAllProjects_ = () => models.projects.findAll({
  include: ['Wallets'],
})
  .then((projects) => projects)
  .catch((error) => {
    logger.error(`Could not get items from \`projects\` table. ${error}`)
    return []
  })


/**
 * Get course from Poloniex Course Exchange API
 *
 * @returns {Promise}
 * @private
 */
const getCourse_ = () => new Promise((resolve) => {
  const getData_ = () => {
    getCourseFromPoloniex()
      .then((course) => {
        resolve(course)
      })
      .catch((error) => {
        logger.error(`Could not get poloniex course. Error: ${error}`)
        setTimeout(() => { getData_() }, 200)
      })
  }

  getData_()
})


/**
 * Update project balance in `projects_prices` table
 *
 * @param project - item from `projects` table with `wallets`
 * @param course - prices from poloniex { ETH_BTC: 0, ETH_USD: 0, BTC_USD: 0 }
 * @returns {Object} price = { price_btc: 0, price_eth: 0, price_usd: 0 }
 * @private
 */
const updateProjectBalance_ = async (project, course) => {
  const price = { price_btc: 0, price_eth: 0, price_usd: 0 }


  const wallets = project.getDataValue('Wallets')


  let value = 0

  wallets.map((wallet) => {
    value = wallet.getDataValue('total_value')
    switch (wallet.getDataValue('type')) {
      case 'eth':
        price.price_btc += parseFloat(course.ETH_BTC) * parseFloat(value)
        price.price_eth += parseFloat(value)
        price.price_usd += parseFloat(course.ETH_USD) * parseFloat(value)
        break
      case 'btc':
        price.price_btc += parseFloat(value)
        price.price_eth += (1 / parseFloat(course.ETH_BTC)) * parseFloat(value)
        price.price_usd += parseFloat(course.BTC_USD) * parseFloat(value)
        break
    }
  })
  models.projects_prices.create(Object.assign(price, { project_id: project.getDataValue('id') }))

  return price
}


/**
 * Update projects information - working scraper
 */
const doWork = async () => {
  logger.info('Wallets: start work')
  wallets = await getAllWallets_()

  while (wallets.length !== 0) {
    await updateTransactions_(wallets.shift())
  }

  course = await getCourse_()
  projects = await getAllProjects_()

  while (projects.length !== 0) {
    await updateProjectBalance_(projects.shift(), course)
  }

  projects = null
  wallets = null
  course = null

  logger.info('Wallets: finished work')
}


const initWallets_ = async function () {
  await doWork()
  setInterval(doWork, 1000 * 60 * 60 * process.env.WALLETS_SCRAPER_TIME)
}


module.exports = {
  init: initWallets_,
  getCourse: getCourse_,
  updateTransactions: updateTransactions_,
  updateProjectBalance: updateProjectBalance_,
}
