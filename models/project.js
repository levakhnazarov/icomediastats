module.exports = function (sequelize, Sequelize) {
  'use strict'

  const Model = sequelize.define('projects', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    name: {
      type: Sequelize.TEXT,
      notEmpty: true,
    },

    ticker: {
      type: Sequelize.TEXT,
      notEmpty: true,
    },

  }, {
    underscored: true,
  })

  Model.associate = function (models) {
    models.projects.hasMany(models.projects_prices, { as: 'Prices' })
    models.projects.hasMany(models.project_wallet, { as: 'Wallets' })
  }

  return Model
}
