module.exports = function (sequelize, Sequelize) {
  'use strict'

  const Model = sequelize.define('exchange_ranks', {
    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
      notEmpty: true,
    },
    exchange_id: {
      type: Sequelize.INTEGER,
    },

    twitter_followers: {
      type: Sequelize.INTEGER,
    },
    alexa_rank: {
      type: Sequelize.INTEGER,
    },

  }, {
    updatedAt: false,
    underscored: true,
  })

  return Model
}
