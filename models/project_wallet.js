module.exports = function (sequelize, Sequelize) {
  'use strict'

  const Model = sequelize.define('project_wallet', {

    project_id: { // Project ID
      type: Sequelize.INTEGER,
    },

    address: {
      type: Sequelize.STRING,
    },

    type: { // btc || eth
      type: Sequelize.STRING,
    },

    last_block: { // shows the number of last transaction
      type: Sequelize.INTEGER,
    },

    total_value: {
      type: Sequelize.DOUBLE,
    },

    current_value: {
      type: Sequelize.DOUBLE,
    },

  }, {
    createdAt: false,
    underscored: true,
  })

  return Model
}
