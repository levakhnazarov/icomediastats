module.exports = function (sequelize, Sequelize) {
  'use strict'

  const Model = sequelize.define('people_scores', {

    people_id: { // from API
      type: Sequelize.INTEGER,
    },

    score: { // from API
      type: Sequelize.DOUBLE,
    },

  }, {
    updatedAt: false,
    underscored: true,
    freezeTableName: true,
  })

  return Model
}
