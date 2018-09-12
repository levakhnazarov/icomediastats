const express = require('express')


const router = express.Router()
const models = require('../models')
const hypescore = require('./../modules/hypescore')

/* GET all projects */
router.get('/icos', (req, res, next) => {
  models.icos.findAll({
    include: ['icoScores'],
    order: [['created_at', 'DESC']],
  })
    .then((icos) => {
      const results = icos.map((ico) => {
        const score = ico.getDataValue('icoScores')[ico.getDataValue('icoScores').length - 1] || {}

        return Object.assign(
          {},
          {
            id: ico.getDataValue('id'),
            name: ico.getDataValue('name'),
            website: ico.getDataValue('website'),
            telegram: ico.getDataValue('telegram'),
            bitcointalk: ico.getDataValue('bitcointalk'),
            twitter: ico.getDataValue('twitter'),
            facebook: ico.getDataValue('facebook'),
            reddit: ico.getDataValue('reddit'),
            medium: ico.getDataValue('medium'),
            admin_score: ico.getDataValue('admin_score'),
            scores: {
              telegram: score.telegram,
              bitcointalk: score.bitcointalk,
              twitter: score.twitter,
              facebook: score.facebook,
              reddit: score.reddit,
              medium: score.medium,
              bing: score.bing,
              total_visits: score.total_visits,
              mentions: score.mentions,
              admin_score: score.admin_score,
              hype_score: score.hype_score,
              created_at: score.created_at,
            },
            updated_at: ico.getDataValue('updated_at'),
            created_at: ico.getDataValue('created_at'),
          }
        )
      })

      res.json({
        status: 1,
        message: 'ICOs get successfully',
        data: results,
      })
    })
})

/* Add project */
router.post('/ico/add', (req, res, next) => {
  if (req.body.name === undefined) {
    return res.json({
      status: 0,
      message: 'Error occur: missed `name` data',
    })
  }

  let insertedIco = {
    name: req.body.name,
    website: req.body.website,
    telegram: req.body.telegram,
    bitcointalk: req.body.bitcointalk,
    twitter: req.body.twitter,
    facebook: req.body.facebook,
    reddit: req.body.reddit,
    medium: req.body.medium,
    admin_score: req.body.admin_score,
  }

  models.icos.create(insertedIco)
    .then(async (ico) => {
      insertedIco.id = ico.getDataValue('id')
      insertedIco.updated_at = ico.getDataValue('updated_at')
      insertedIco.created_at = ico.getDataValue('created_at')

      insertedIco = await hypescore.updateScores(insertedIco)

      res.json({
        status: 1,
        message: 'ICO created successfully',
        data: insertedIco,
      })
    })
})

/* UPDATE project */
router.put('/ico/:id', (req, res, next) => {
  models.icos.findOne({
    where: { id: req.params.id },
  })
    .then(async (ico) => {
      if (ico === null) {
        res.json({
          status: 0,
          message: `ICO with id=${req.params.id} not found`,
        })
      } else {
        ico.updateAttributes({
          name: req.body.name,
          website: req.body.website,
          telegram: req.body.telegram,
          bitcointalk: req.body.bitcointalk,
          twitter: req.body.twitter,
          facebook: req.body.facebook,
          reddit: req.body.reddit,
          medium: req.body.medium,
          admin_score: req.body.admin_score,
        })

        let newICO = {
          id: ico.getDataValue('id'),
          name: ico.getDataValue('name'),
          website: ico.getDataValue('website'),
          telegram: ico.getDataValue('telegram'),
          bitcointalk: ico.getDataValue('bitcointalk'),
          twitter: ico.getDataValue('twitter'),
          facebook: ico.getDataValue('facebook'),
          reddit: ico.getDataValue('reddit'),
          medium: ico.getDataValue('medium'),
          admin_score: ico.getDataValue('admin_score'),
          updated_at: ico.getDataValue('updated_at'),
          created_at: ico.getDataValue('created_at'),
        }

        newICO = await hypescore.updateScores(newICO)

        res.json({
          status: 1,
          message: 'ICO updated successfully',
          data: newICO,
        })
      }
    })
})

/* DELETE project */
router.delete('/ico/:id', (req, res, next) => {
  models.icos.destroy({
    where: { id: req.params.id },
  }).then((result) => {
    if (result === 0) {
      res.json({
        status: 0,
        message: `ICO with id=${req.params.id} not found`,
      })
    } else {
      res.json({
        status: 1,
        message: 'ICO deleted successfully',
      })
    }
  })
})

module.exports = router
