module.exports = function (sequelize, Sequelize) {
  'use strict'

  const Model = sequelize.define('icos_scores', {

    ico_id: {
      type: Sequelize.INTEGER,
      notEmpty: true,
    },

    telegram: {
      type: Sequelize.INTEGER,
    },

    bitcointalk: {
      type: Sequelize.INTEGER,
    },

    twitter: {
      type: Sequelize.INTEGER,
    },

    facebook: {
      type: Sequelize.INTEGER,
    },

    reddit: {
      type: Sequelize.INTEGER,
    },

    medium: {
      type: Sequelize.INTEGER,
    },

    bing: {
      type: Sequelize.INTEGER,
    },

    total_visits: {
      type: Sequelize.INTEGER,
    },

    mentions: {
      type: Sequelize.INTEGER,
    },

    admin_score: {
      type: Sequelize.INTEGER,
    },

    hype_score: {
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
