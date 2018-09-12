const express = require('express')


const router = express.Router()
const models = require('../models')
const Projects = require('./../modules/wallets')

/**
 * Delete wallet and transactions if address is not conern to another wallets
 *
 * @param newWallets - array of addresses `['address1',...]`
 * @param wallets - array of existed wallets `Model of project_wallet`
 * @returns {Promise}
 * @private
 */
const deleteWallets_ = async (newWallets, wallets) => {
  let sameAddress = null


  let address = null


  let wallet = null


  let type = null

  while (wallets.length !== 0) {
    wallet = wallets.pop()
    address = wallet.getDataValue('address')
    type = wallet.getDataValue('type')

    // IF wallet was deleted
    if (newWallets.indexOf(address) === -1) {
      // delete wallet
      await wallet.destroy()

      // check if another wallets have same address
      sameAddress = await models.project_wallet.findOne({ where: { address } })

      // IF have not same address => delete transactions
      if (sameAddress === null) {
        switch (type) {
          case 'eth':
            await models.transaction_eth.destroy({ where: { address } })
            break
          case 'btc':
            await models.transaction_btc.destroy({ where: { address } })
            break
        }
      }
    } else {
      await Projects.updateTransactions(wallet)
    }
  }
}


/* GET all projects */
router.get('/projects', (req, res, next) => {
  models.projects.findAll({
    include: ['Prices', 'Wallets'],
    order: [['created_at', 'DESC']],
  })
    .then((projects) => {
      const results = projects.map((project) => {
        const price = project.getDataValue('Prices')[project.getDataValue('Prices').length - 1] || null


        const wallets = project.getDataValue('Wallets')

        return Object.assign(
          {},
          {
            id: project.getDataValue('id'),
            name: project.getDataValue('name'),
            ticker: project.getDataValue('ticker'),
            wallets: wallets.map((wallet) => wallet.address).join(','),
            price_btc: price ? price.getDataValue('price_btc') : 0,
            price_eth: price ? price.getDataValue('price_eth') : 0,
            price_usd: price ? price.getDataValue('price_usd') : 0,
            price_updated_at: price ? price.getDataValue('created_at') : 0,
            updated_at: project.getDataValue('updated_at'),
            created_at: project.getDataValue('created_at'),
          }
        )
      })

      res.json({
        status: 1,
        message: 'Projects get successfully',
        data: results,
      })
    })
    .catch((error) => {
      res.json({
        status: 0,
        message: `Projects get error. ${error}`,
      })
    })
})


/* ADD project */
router.post('/project/add', async (req, res, next) => {
  if (req.body.name === undefined || req.body.wallets === undefined || req.body.ticker === undefined) {
    return res.json({
      status: 0,
      message: 'Error occur: missed `name`, `wallets` or `ticker` data',
    })
  }

  const projectData = {
    name: req.body.name,
    ticker: req.body.ticker,
  }

  const project = await models.projects.findOne({ where: projectData })

  if (project) {
    return res.json({
      status: 0,
      message: 'Project with such `name` and `ticker` existed',
    })
  }

  models.projects.create(projectData)
    .then(async (project) => {
      const wallets = req.body.wallets.split(',')


      let type = null


      let counter = 0


      let wallet = null


      let isValid = false

      while (counter < wallets.length) {
        if (wallets[counter].length === 42) {
          isValid = true
          type = 'eth'
        } else if ((wallets[counter][0] === '1' || wallets[counter][0] === '3') && wallets[counter].length >= 26 && wallets[counter].length <= 35) {
          isValid = true
          type = 'btc'
        } else {
          isValid = false
        }

        if (isValid) {
          // Check if address already scraped
          const walletWithSameAddress = await models.project_wallet.findOne({ where: { address: wallets[counter] }, order: [['updated_at', 'DESC']] })

          wallet = {
            project_id: project.getDataValue('id'),
            address: wallets[counter],
            type,
            last_block: walletWithSameAddress ? walletWithSameAddress.getDataValue('last_block') : 0,
            total_value: walletWithSameAddress ? walletWithSameAddress.getDataValue('total_value') : 0,
            current_value: walletWithSameAddress ? walletWithSameAddress.getDataValue('current_value') : 0,
          }
          wallet = await models.project_wallet.create(wallet)
          await Projects.updateTransactions(wallet)
        }
        counter++
      }

      project = await models.projects.findOne({ where: { id: project.getDataValue('id') }, include: ['Wallets'] })

      const course = await Projects.getCourse()


      const price = await Projects.updateProjectBalance(project, course)

      res.json({
        status: 1,
        message: 'Project created successfully',
        data: {
          id: project.getDataValue('id'),
          name: project.getDataValue('name'),
          ticker: project.getDataValue('ticker'),
          wallets: project.getDataValue('Wallets').map((wallet) => wallet.address).join(','),
          price_btc: price.price_btc,
          price_eth: price.price_eth,
          price_usd: price.price_usd,
          price_updated_at: new Date(),
          updated_at: project.getDataValue('updated_at'),
          created_at: project.getDataValue('created_at'),
        },
      })
    })
    .catch((error) => {
      res.json({
        status: 0,
        message: `Error occur on creating project. ${error}`,
      })
    })
})


/* UPDATE project */
router.put('/project/:id', (req, res, next) => {
  const id = req.params.id

  models.projects.findOne({
    where: { id },
    include: ['Wallets'],
  })
    .then(async (project) => {
      if (project === null) {
        return res.json({
          status: 0,
          message: `Project with id=\`${id}\` not found`,
        })
      }

      project = await project.updateAttributes({ name: req.body.name, ticker: req.body.ticker })

      const newWallets = req.body.wallets.split(',')


      const oldWallets = project.getDataValue('Wallets').map((wallet) => wallet.getDataValue('address'))


      let wallet = null


      let isValid = null


      let type = null

      await deleteWallets_(newWallets, project.getDataValue('Wallets'))

      for (const i in newWallets) {
        if (oldWallets.indexOf(newWallets[i]) === -1) {
          if (newWallets[i].length === 42) {
            isValid = true
            type = 'eth'
          } else if ((newWallets[i][0] === '1' || newWallets[i][0] === '3') && newWallets[i].length >= 26 && newWallets[i].length <= 35) {
            isValid = true
            type = 'btc'
          } else {
            isValid = false
          }

          if (isValid) {
            const walletWithSameAddress = await models.project_wallet.findOne({
              where: { address: newWallets[i] },
              order: [['updated_at', 'DESC']],
            })

            wallet = {
              project_id: project.getDataValue('id'),
              address: newWallets[i],
              type,
              last_block: walletWithSameAddress ? walletWithSameAddress.getDataValue('last_block') : 0,
              total_value: walletWithSameAddress ? walletWithSameAddress.getDataValue('total_value') : 0,
              current_value: walletWithSameAddress ? walletWithSameAddress.getDataValue('current_value') : 0,
            }
            wallet = await models.project_wallet.create(wallet)
            await Projects.updateTransactions(wallet)
          }
        }
      }

      project = await models.projects.findOne({ where: { id: project.getDataValue('id') }, include: ['Wallets'] })

      const course = await Projects.getCourse()


      const price = await Projects.updateProjectBalance(project, course)

      res.json({
        status: 1,
        message: 'Project updated successfully',
        data: {
          id: project.getDataValue('id'),
          name: project.getDataValue('name'),
          ticker: project.getDataValue('ticker'),
          wallets: project.getDataValue('Wallets').map((wallet) => wallet.address).join(','),
          price_btc: price.price_btc,
          price_eth: price.price_eth,
          price_usd: price.price_usd,
          price_updated_at: new Date(),
          updated_at: project.getDataValue('updated_at'),
          created_at: project.getDataValue('created_at'),
        },
      })
    })
    .catch((error) => {
      res.json({
        status: 0,
        message: `Error occur on updating project with id=\`${id}\`. ${error}`,
      })
    })
})

/* DELETE project */
router.delete('/project/:id', (req, res, next) => {
  models.projects.findOne({
    where: { id: req.params.id },
    include: ['Wallets'],
  })
    .then(async (project) => {
      if (project === null) {
        return res.json({
          status: 0,
          message: `Project with id=${req.params.id} not found`,
        })
      }

      await deleteWallets_([], project.getDataValue('Wallets'))

      await project.destroy()

      res.json({
        status: 1,
        message: 'Project deleted successfully',
      })
    })
    .catch((error) => {
      res.json({
        status: 0,
        message: `Error occur on updating project with id=\`${req.param.id}\`. ${error}`,
      })
    })
})

module.exports = router
