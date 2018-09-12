module.exports = function (sequelize, Sequelize) {
  'use strict'

  const Model = sequelize.define('people_social', {

    people_id: {
      type: Sequelize.INTEGER,
    },

    site: {
      type: Sequelize.STRING,
    },

    url: {
      type: Sequelize.STRING,
    },

  }, {
    timestamps: false,
    underscored: true,
    freezeTableName: true,
  })

  return Model
}
