'use strict'

require('dotenv').config()
const fs = require('fs')
const needle = require('needle')
const tress = require('tress')
const cheerio = require('cheerio')
const logger = require('../logger')()
const models = require('../../models')
const icoBench = require('../api/icoBench')


let scraper = null
let api = null
let total = null
let counter = null

/**
 * Search member from `people` table return first by name and ico
 *
 * @param name - person name
 * @param ico - ICO name
 * @returns {Promise}
 * @private
 */
const findMemberIdByIco_ = (name, ico) => models.people.findAll({
  where: {
    name,
    icos: { like: `%${ico}%` },
  },
}).then((members) => members.map((member) => {
  const icos = member.getDataValue('icos').split(',')


  let hasIco = false

  for (const i in icos) {
    if (icos[i] === ico) {
      hasIco = true
    }
  }

  if (hasIco) {
    return Object.assign(
      {},
      {
        id: member.getDataValue('id'),
      }
    )
  }
})[0])


/**
 * Add row to `people_ico` table if not exist
 *
 * @param data { Object }
 * @private
 */
const updateTablePeopleIcos_ = (data) => {
  models.people_ico.findOrCreate({
    where: {
      people_id: data.people_id,
      ico_name: data.ico_name,
    },
    defaults: data,
  })
}


/**
 * Add row to `people_social` table if not exist
 *
 * @param data { Object }
 * @private
 */
const updateTablePeopleSocial_ = (data) => {
  models.people_social.findOrCreate({
    where: {
      people_id: data.people_id,
      site: data.site,
      url: data.url,
    },
    defaults: data,
  })
}

/**
 * Add row to `people_scores` each time of scraping
 *
 * @param data { Object }
 * @private
 */
const updateTablePeopleScore_ = (data) => models.people_scores.create(data)

/**
 * Update person information in table `people`
 *
 * @param personObj - { Object }
 * @private
 */
const updateTablePeople_ = function (personObj) {
  return models.people.findOrCreate({
    where: { id: personObj.id },
    defaults: personObj,
  })
    .spread((person, created) => {
      if (created === false) {
        const icos = person.get('icos').split(',')


        const social = person.get('social').split(',')


        const available_for = person.get('available_for').split(',')

        const attributes = {
          name: person.get('name') !== '' ? person.get('name') : person.name,
          title: person.get('title') !== '' ? person.get('title') : person.title,
          photo: person.get('photo') !== 'no-image.jpg' ? person.get('photo') : person.photo,
          icos: icos.length >= person.icos.length ? person.get('icos') : person.icos,
          country: person.get('country') !== '' ? person.get('country') : person.country,
          about: person.get('about') !== '' ? person.get('about') : person.about,
          social: social.length >= person.social.length ? person.get('social') : person.social,
          available_for: available_for.length >= person.available_for.length ? person.get('available_for') : person.available_for,
          distribution_rates: person.get('distribution_rates') !== -1 ? person.get('distribution_rates') : person.distribution_rates,
          distribution_average_rate: person.get('distribution_average_rate') !== '' ? person.get('distribution_average_rate') : person.distribution_average_rate,
          distribution_weight: person.get('distribution_weight') !== '' ? person.get('distribution_weight') : person.distribution_weight,
          profile_score: person.get('profile_score') !== '' ? person.get('profile_score') : person.profile_score,
          ratings_score: person.get('ratings_score') !== '' ? person.get('ratings_score') : person.ratings_score,
          time_score: person.get('time_score') !== '' ? person.get('time_score') : person.time_score,
          iss: person.get('iss') !== '' ? person.get('iss') : person.iss,
          acceptance_score: person.get('acceptance_score') !== '' ? person.get('acceptance_score') : person.acceptance_score,
          contribution_score: person.get('contribution_score') !== '' ? person.get('contribution_score') : person.contribution_score,
          updated_at: new Date(),
        }

        person.updateAttributes(attributes)
      }
      return 'done'
    })
}


/**
 * Save person photo to Folder
 * @param url - url of photo
 * @private
 */
const savePersonPhoto_ = function (url) {
  const name = url.split('images/')[1].split('/')[1]

  if (name !== 'team') {
    if (!fs.existsSync(process.env.PEOPLE_IMAGES_PATH + name)) {
      needle.get(url).pipe(fs.createWriteStream(process.env.PEOPLE_IMAGES_PATH + name))
    }
  }
}


/**
 * Get all people from icoBench
 *
 * @param api - icoBench api
 * @private
 */
const getAllPeople_ = function (api) {
  return new Promise((resolve) => {
    let page = 0

    const getPage_ = function () {
      api.get('people/all', (data) => {
        if (process.env.NODE_ENV === 'development') { logger.info(`Getting from API: \`https://icobench.com/people/all/${page}\` from ${data.pages}`) }

        if (data.error) {
          logger.error(`ICOBench error: \`${data.error}\`. Getting from API: \`https://icobench.com/icos/all/${page}\` from ${data.pages}`)
          setTimeout(() => { getPage_(page) }, 200)
        } else if (data.results === undefined) {
          setTimeout(() => { getPage_(page) }, 200)
        } else {
          for (let i = 0; i < data.results.length; i++) {
            savePersonPhoto_(data.results[i].photo)
            scraper.push(data.results[i])
          }
          if (data.currentPage !== data.pages - 1) {
            getPage_(page++)
          } else {
            logger.info('Receive all people from source `https://icobench.com/people/all`.')
            resolve()
          }
        }
      }, { page })
    }

    getPage_(page)
  })
}


/**
 * Initialize scraping function for parsing people page
 *
 * @private
 */
const initScraper_ = function () {
  scraper = tress((object, callback) => {
    needle('get', object.url)
      .then(async (response) => {
        const $ = cheerio.load(response.body)

        const distribution = $("h3:contains('Rating distribution')").next()


        let social = ''


        let available_for = ''


        const distribution_rates = $("small:contains('rates')", distribution).parent().text().replace(/[^0-9.]/g, '')


        const distribution_average_rate = $("small:contains('average rate')", distribution).parent().text().replace(/[^0-9.]/g, '')


        const distribution_weight = $("h3:contains('Weight distribution')").next().find('b').text()
          .trim()


        const profile_score = $("label:contains('Profile score')").parent().find('.value').text()
          .split('/')[0]


        const ratings_score = $("label:contains('Ratings score')").parent().find('.value').text()
          .split('/')[0]


        const time_score = $("label:contains('Time score')").parent().find('.value').text()
          .split('/')[0]


        const iss = $("label:contains('ISS')").parent().find('.value').text()
          .split('/')[0]


        const acceptance_score = $("label:contains('Acceptance score')").parent().find('.value').text()
          .split('/')[0]


        const contribution_score = $("label:contains('Contribution score')").parent().find('.value').text()
          .split('/')[0]

        $('.links a').each((i, el) => {
          social += $(el).attr('href') + ((i < $('.links a').length - 1) ? ',' : '')
        })

        $("h4:contains('Available for')").next().find('.tag').each((i, el) => {
          available_for += $(el).text().trim() + ((i < $('.links a').length - 1) ? ',' : '')
        })

        await updateTablePeople_({
          id: object.id === 0 ? object._id : object.id,
          name: object.name,
          title: object.title,
          photo: object.photo.split('images/')[1].split('/')[1] === 'team' ? 'no-image.jpg' : object.photo.split('images/')[1].split('/')[1],
          icos: object.icos.map((el) => el.name.trim()).join(','),
          country: $('.location').text().trim(),
          about: $("h3:contains('About')").next().text().trim(),
          social,
          available_for,
          distribution_rates: distribution_rates !== '' ? distribution_rates : -1,
          distribution_average_rate: distribution_average_rate !== '' ? distribution_average_rate : -1,
          distribution_weight: distribution_weight !== '' ? distribution_weight : -1,
          profile_score: profile_score !== '' ? profile_score : -1,
          ratings_score: ratings_score !== '' ? ratings_score : -1,
          time_score: time_score !== '' ? time_score : -1,
          iss: iss !== '' ? iss : -1,
          acceptance_score: acceptance_score !== '' ? acceptance_score : -1,
          contribution_score: contribution_score !== '' ? contribution_score : -1,
        })

        await updateTablePeopleScore_({
          people_id: object.id === 0 ? object._id : object.id,
          score: object.iss,
        })

        callback()
      })
      .catch((error) => {
        logger.error(`Could not load source \`${object.url}\`. Error: ${error}`)
        scraper.push(object)
        callback()
      })
  }, 12)
}


/**
 * Get total ICOs number from `ICOs - All` API
 *
 * @param api - icoBench
 * @returns {Promise}
 * @private
 */
const getIcosTotal_ = (api) => new Promise((resolve, reject) => {
  const getData = () => {
    api.get('icos/all', (data) => {
      if (data.error) {
        return reject(data.error)
      } else if (data.results === undefined) {
        setTimeout(() => { getData() }, 200)
      } else {
        resolve(data.icos)
      }
    })
  }

  getData()
})


/**
 * Get team from `ICO - Profile` API
 *
 * @param api - icoBench API
 * @param id - ico ID
 * @returns {Promise}
 * @private
 */
const getTeamFromIco_ = function (api, id) {
  return new Promise((resolve, reject) => {
    const getData = () => {
      api.get(`ico/${id}`, async (data) => {
        if (process.env.NODE_ENV === 'development') { logger.info(`Getting from API: \`https://icobench.com/ico/${data.id}\` from ${total}`) }

        if (data.error) {
          return reject(data.error)
        } else if (data.id === undefined) {
          setTimeout(() => { getData() }, 200)
        } else {
          const team = data.team

          if (team.length) {
            for (const i in team) {
              const member = await findMemberIdByIco_(team[i].name, data.name)

              if (member !== undefined) {
                await updateTablePeopleIcos_({
                  people_id: member.id,
                  ico_name: data.name,
                  title: team[i].title,
                  group: team[i].group,
                })
                for (const j in team[i].socials) {
                  await updateTablePeopleSocial_({
                    people_id: member.id,
                    site: team[i].socials[j].site,
                    url: team[i].socials[j].url,
                  })
                }
              }
            }
          }
          resolve()
        }
      })
    }

    getData()
  })
}


const doWork = async () => {
  logger.info('People: initialize scraping')
  counter = 0
  total = 0
  api = new icoBench()

  await getAllPeople_(api)

  total = await getIcosTotal_(api)
    .catch((error) => {
      logger.error(`ICOBench error: \`${error}\`. Getting from API: \`https://icobench.com/icos/all\``)
      return 1000
    })

  while (++counter <= total) {
    await getTeamFromIco_(api, counter)
      .catch((error) => {
        logger.error(`ICOBench error: \`${error}\`. Getting from API: \`https://icobench.com/ico/${counter}\``)
      })
  }

  counter = null
  total = null
  api = null
  logger.info('People: finished scraping')
}

/**
 * Scraping people every 24 hours
 * @private
 */
const initPeople_ = (function () {
  initScraper_()
  doWork()
  setInterval(doWork, 1000 * 60 * 60 * process.env.PEOPLE_SCRAPER_TIME)
}())
