module.exports = function (sequelize, Sequelize) {
  'use strict'

  const Model = sequelize.define('people', {

    id: { // from API
      primaryKey: true,
      type: Sequelize.INTEGER,
      notEmpty: true,
    },

    name: { // from API
      type: Sequelize.TEXT,
      notEmpty: true,
    },

    title: { // from API
      type: Sequelize.TEXT,
      notEmpty: true,
    },

    photo: { // from API
      type: Sequelize.TEXT,
      notEmpty: true,
    },

    icos: { // from API
      type: Sequelize.TEXT,
      notEmpty: true,
    },

    country: {
      type: Sequelize.TEXT,
    },

    social: {
      type: Sequelize.TEXT,
    },

    about: {
      type: Sequelize.TEXT,
    },

    available_for: {
      type: Sequelize.TEXT,
    },

    distribution_rates: {
      type: Sequelize.INTEGER,
    },

    distribution_average_rate: {
      type: Sequelize.FLOAT,
    },

    distribution_weight: {
      type: Sequelize.INTEGER,
    },

    profile_score: {
      type: Sequelize.INTEGER,
    },

    ratings_score: {
      type: Sequelize.INTEGER,
    },

    time_score: {
      type: Sequelize.INTEGER,
    },

    iss: {
      type: Sequelize.INTEGER,
    },

    acceptance_score: {
      type: Sequelize.INTEGER,
    },

    contribution_score: {
      type: Sequelize.INTEGER,
    },

  }, {
    underscored: true,
  })

  Model.associate = function (models) {
    models.people.hasMany(models.people_scores, { as: 'Scores' })
    models.people.hasMany(models.people_ico, { as: 'Icos' })
    models.people.hasMany(models.people_social, { as: 'Social' })
  }

  return Model
}
