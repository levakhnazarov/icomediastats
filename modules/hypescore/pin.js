const models = require('../../models')
const logger = require('../logger')()


try {
  models.sequelize.sync().then(() => {
    logger.info('pinned msgs initialize')
    require('./index').pins()
  })
} catch (error) {
  logger.error(`Error occur on initialize hypescore scraper. ${error}`)
}
