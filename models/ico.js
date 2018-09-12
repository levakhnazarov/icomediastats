module.exports = function (sequelize, Sequelize) {
  'use strict'

  const Model = sequelize.define('icos', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
      notEmpty: true,
    },

    name: {
      type: Sequelize.TEXT,
      notEmpty: true,
    },

    website: {
      type: Sequelize.STRING,
    },

    telegram: { // @channelusername
      type: Sequelize.STRING,
    },

    bitcointalk: { // topic_number
      type: Sequelize.STRING,
    },

    twitter: { // page_name
      type: Sequelize.STRING,
    },

    facebook: { // page_name
      type: Sequelize.STRING,
    },

    reddit: { // page_name
      type: Sequelize.STRING,
    },

    medium: { // @user_name
      type: Sequelize.STRING,
    },

    admin_score: {
      type: Sequelize.INTEGER,
    },
    created_at: {
      type: Sequelize.DATE,
    },
    end_date: {
      type: Sequelize.DATE,
    },

  }, {
    underscored: true,
  })

  Model.associate = function (models) {
    models.icos.hasMany(models.icos_scores, { as: 'icoScores' })
  }

  return Model
}
