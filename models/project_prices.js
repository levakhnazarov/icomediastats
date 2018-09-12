module.exports = function (sequelize, Sequelize) {
  'use strict'

  const Model = sequelize.define('projects_prices', {

    project_id: { // Project ID
      type: Sequelize.INTEGER,
    },

    price_btc: {
      type: Sequelize.DOUBLE,
    },

    price_eth: {
      type: Sequelize.DOUBLE,
    },

    price_usd: {
      type: Sequelize.DOUBLE,
    },

  }, {
    updatedAt: false,
    underscored: true,
  })

  return Model
}
