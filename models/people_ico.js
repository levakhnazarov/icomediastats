module.exports = function (sequelize, Sequelize) {
  'use strict'

  const Model = sequelize.define('people_ico', {

    people_id: {
      type: Sequelize.INTEGER,
    },

    ico_name: {
      type: Sequelize.STRING,
    },

    title: {
      type: Sequelize.STRING,
    },

    group: {
      type: Sequelize.STRING,
    },

  }, {
    timestamps: false,
    underscored: true,
    freezeTableName: true,
  })

  return Model
}
