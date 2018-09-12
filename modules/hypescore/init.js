const models = require('../../models')
const logger = require('../logger')()


try {
  models.sequelize.sync().then(() => {
    logger.info('Hypescore scraper initialize')
    require('./index').init()
  })
} catch (error) {
  logger.error(`Error occur on initialize hypescore scraper. ${error}`)
}
