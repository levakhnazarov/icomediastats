'use strict'

const { Op } = require('sequelize')
const moment = require('moment')


const division = 100
const slack = require('slack-notify')(process.env.SLACK_NOTIFY)
const request = require('request')
const os = require('os')
const querystring = require('querystring')
const escapeJSON = require('escape-json-node')
const consts = require('../../models/constants')
const models = require('../../models')
const logger = require('../logger')()


let _dayIterator = 7

const prodIcoratingInstance = function () {
  const Sequelize = require('sequelize')

  return new Sequelize(
    process.env.DB_PROD_DATABASE,
    process.env.DB_PROD_USER,
    process.env.DB_PROD_PASSWORD,
    {
      host: process.env.DB_PROD_HOST,
      dialect: 'mysql',
      logging: false,
      freezeTableName: true,
      operatorsAliases: false,
    }
  )
}

const prodIcowalletInstance = function () {
  const Sequelize = require('sequelize')

  return new Sequelize(
    process.env.DB_DATABASE,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      dialect: 'mysql',
      logging: false,
      freezeTableName: true,
      operatorsAliases: false,
    }
  )
}

/**
 * Get Exchanges from DB
 * @private
 */
const getExchanges_ = function () {
  const sequelize = prodIcoratingInstance()

  return sequelize.query('SELECT a.id, a.name, a.url, b.url as twitter FROM exchanges a inner join socials b on a.id = b.socialable_id where b.social_type_id = 3  and b.socialable_type = \'exchange\'').then((exchanges) => {
    if (exchanges.length > 0) {
      return exchanges[0].map((exchange) => Object.assign(
        {},
        {
          id: exchange.id,
          name: exchange.name,
          url: exchange.url,
          twitter: exchange.twitter,

        }
      ))
    }
  })
}

/**
 * Get Not Finished YET ICOs from DB
 * @private
 */
const getNotFinishedIcos_ = function () {
  const sequelize = prodIcoratingInstance()


  return sequelize.query(`SELECT ico_descriptions.ico_id as id, ico_crowdsales.end_date_ico as end_date_ico, ico_crowdsales.start_date_ico as start_date_ico,
        ico_descriptions.name, ico_links.site, ico_links.btctalk, ico_links.linkedin, 
        ico_links.twitter, ico_links.facebook, ico_links.instagram, ico_links.telegram, ico_links.youtube,
        ico_links.blog, ico_links.email, ico_links.youtube, ico_links.steemit, ico_links.reddit, 
        ico_links.medium, ico_links.github, ico_links.slack, ico_links.google_market, ico_links.apple_store
    FROM ico_descriptions
    INNER JOIN ico_crowdsales on ico_descriptions.ico_id = ico_crowdsales.ico_id
     INNER JOIN ico_links on ico_descriptions.ico_id = ico_links.ico_id `
    // WHERE ico_crowdsales.end_date_ico IS NULL OR ico_crowdsales.end_date_ico >= CURDATE()`
  ).then((allicos) => {
    if (allicos.length > 0) {
      return allicos[0].map((ico) => {
        const telegram = ico.telegram
          ? ico.telegram.replace('https://telegram.me/', '@').replace('https://t.me/', '@').replace('http://t.me/', '@').replace(/\/$/, '') : ''


        const btctalk = ico.btctalk ? ico.btctalk : ''


        const twitter = ico.twitter ? ico.twitter : ''


        const facebook = ico.facebook ? ico.facebook : ''


        const reddit = ico.reddit ? ico.reddit : ''


        const medium = ico.medium ? ico.medium : ''


        return Object.assign(
          {},
          {
            id: ico.id,
            name: ico.name,
            website: ico.site,
            youtube: ico.youtube,
            start_date_ico: ico.start_date_ico,
            end_date_ico: ico.end_date_ico,
            telegram,
            bitcointalk: btctalk.replace('https://bitcointalk.org/index.php?topic=', '').replace(/\/$/, ''),
            twitter: twitter.replace('https://twitter.com/', '').replace(/\/$/, ''),
            facebook: facebook.replace('https://www.facebook.com/', '').replace(/\/$/, ''),
            reddit: reddit.replace('https://www.reddit.com/r/', '').replace('https://www.reddit.com/user/', '').replace(/\/$/, ''),
            medium: medium.replace('https://medium.com/', '@').replace('@@', '@').replace(/\/$/, ''),
          }
        )
      })
    }
  })
}


const isQualifiedStatNumber = function (crazyKey, crazyValue) {
  if ((typeof crazyKey === 'object' && crazyKey !== null
        && crazyKey.hasOwnProperty(crazyValue)
        && isObject(crazyKey[crazyValue])
        && crazyKey[crazyValue].hasOwnProperty('parsed')
        && crazyKey[crazyValue].hasOwnProperty('contentError')
        && crazyKey[crazyValue].hasOwnProperty('serverError')
        && crazyKey[crazyValue].hasOwnProperty('customError'))) {
    return true
  }
  return false
}

const renderStatsNotifyJson = function (chunkedStats, args, countString, color, adoption = true) {
  const fieldsArr = []

  for (const prop in chunkedStats) {
    adoption = false
    if (isQualifiedStatNumber(chunkedStats, prop)) {
      fieldsArr.push({
        title: prop,
        color: '#439FE0',
        value: `${chunkedStats[prop].parsed} ${
          chunkedStats[prop].contentError} ${
          chunkedStats[prop].serverError} ${
          chunkedStats[prop].customError}\n`,
        // + chunkedStats[prop]._averageTime + " s.",
        short: true,
        // "thumb_url":"/assets/media/"+prop+".png"
      })
    }
  }
  const layout = {
    attachments: [
      {
        fields: fieldsArr,
        color,
        fallback: args || countString,
        title: !(countString === 'header') ? countString : '',
        // "author_name": args?args:"actual statistics",
        // "author_link": "http://flickr.com/bobby/",
        author_icon: 'http://flickr.com/icons/bobby.jpg',
        // "title": "Slack API Documentation",
        // "title_link": "https://api.slack.com/",
        text: adoption ? '[0(parsed) 0(content error) 0(server error) 0(another error)]' : '',

        // "image_url": "http://my-website.com/path/to/image.jpg",
        // "thumb_url": "http://example.com/path/to/thumb.png",
        footer: args || `avg time / 1 ico: ${Math.round(chunkedStats.telegram._averageTime)} s` + ` on: ${os.hostname()}`,
        footer_icon: 'https://platform.slack-edge.com/img/default_application_icon.png',
        ts: +Math.floor(Date.now() / 1000),

      },
    ],
  }


  return layout
}

const sendSlackNotifyEvent_ = function (text, args, count, color, adoption = true) {
  const opts = {
    method: 'POST',
    url: process.env.SLACK_NOTIFY,
    headers:
            {
              'cache-control': 'no-cache',
              'content-type': 'application/json',
            },
    json: renderStatsNotifyJson(text, args, count, color, adoption),

  }

  request(opts, (error, response, body) => {
    if (error) { return error }

    return body
  })
}
/**
 * Utility function to check for object
 * @private
 */
let isObject = function (a) {
  return (!!a) && (a.constructor === Object)
}

/**
 * Insert score to Table `exchange_ranks`
 * @param exchange - Object
 * @private
 */
const insertExchangeScoreToDB_ = function (exchange) {
  const sequelize = prodIcoratingInstance()

  sequelize.query(`update exchanges set alexa_rank = ${exchange.alexa_rank}, twitter_followers = ${exchange.twitter_followers} where id = ${exchange.exchange_id}`)
    .spread((result, metadata) => models.exchange_ranks.create(exchange))
}

/**
 * Insert score to Table `icos_scores`
 * @param score - Object
 * @private
 */
const insertScoreToDB_ = function (score) {
  score.mentions = !isNaN(score.mentions) ? score.mentions : -2
  return models.icos_scores.create(score)
}


const simpleWaitTransaction = function (ms) {
  const start = new Date().getTime()
  let end = start

  while (end < start + ms) {
    end = new Date().getTime()
  }
}
/**
 * Call functions for updating exchange score
 * @param exchange - Object
 * @returns score - Object
 * @private
 */
const updateExchange_ = async function (exchange) {
  let twitter = await require('./twitter').countFollowers(exchange.twitter)
  let alexa = await require('./alexa').countRank(exchange.url)

  twitter = (typeof twitter !== 'undefined') ? twitter : 0
  alexa = (typeof alexa !== 'undefined') ? alexa : 0

  const scores = {
    exchange_id: exchange.id,
    twitter_followers: twitter,
    alexa_rank: alexa,
    created_at: new Date(),
  }
  const result = await insertExchangeScoreToDB_(scores)

  return scores
}

/**
 * Call functions for updating ico score
 * @param ico - Object
 * @returns score - Object
 * @private
 */
const updateIco_ = async function (ico) {
  const scores = {
    ico_id: ico.id,
    // facebook: await require('./facebook').countFollowers(ico.facebook),
    telegram: await require('./telegram').countChatMembers(ico.telegram),
    // bitcointalk: await require('./bitcointalk').countFollowers(ico.bitcointalk),
    // twitter: await require('./twitter').countFollowers(ico.twitter),
    // reddit: await require('./reddit').countFollowers(ico.reddit),
    // medium: await require('./medium').countFollowers(ico.medium),
    // bing: ((_dayIterator % 7) === 0) ? await require('./bind')(ico.name, ico.website) : -5,
    // total_visits: await require('./total_visits')(ico.website),
    // mentions: await require('./mainrest')(ico.name),
    // alexa_rank: ((_dayIterator % 7) === 0) ? await require('./alexa').countRank(ico.website) : -5,
    admin_score: 0,
    hype_score: 0,
    created_at: new Date(),
  }
  const result = await insertScoreToDB_(scores)

  return scores
}


/**
 * Call functions for updating pinned messages
 * @param ico - Object
 * @returns score - Object
 * @private
 */
const updatePinned_ = async function (ico) {
  const scores = {
    ico_id: ico.id,
    telegram: await require('./telegram').updatePinnedMessages(ico.telegram),
    created_at: new Date(),
  }
  const result = await insertPinnedScoresToDB_(scores)

  return scores
}

/**
 *
 * @returns {Promise<void>}
 * @private
 */

const updateExchangesScores_ = async function () {
  const exchanges = await getExchanges_()

  sendSlackNotifyEvent_({}, `start web crawling '${exchanges.length}' exchanges on. ${os.hostname()} with ui division by ${division}`, 'header', '#e02a20', false)
  let countPidOperations = 0; let twitterNoResults = 0; let
    alexaNoResults = 0


  for (const iterator in exchanges) {
    const result = await updateExchange_(exchanges[iterator])

    if (result.alexa_rank < 0) alexaNoResults++
    if (result.twitter_followers < 0) twitterNoResults++

    countPidOperations++
    if ((countPidOperations % division) == 0) {
      sendSlackNotifyEvent_({}, `exchanges with no alexa rating: ${alexaNoResults}\n exchanges with no twitter followers count: ${twitterNoResults}`, 'header', '#e02a20', false)
    }
  }
}

const updateYoutubeScores_ = async function () {
  return new Promise((async (resolve, reject) => {
    const icos = await getNotFinishedIcos_()


    // sendSlackNotifyEvent_({}, "youtube analytics for '" + icos.length + "' on. " + os.hostname() + " with ui division by " + division, "header", "#e02a20", false);
    const countPidOperations = 0; const twitterNoResults = 0; const
      alexaNoResults = 0
    const noIcos = []


    const filteredIcos = icos.filter((elem) => {
      if (typeof elem.youtube === 'string' && elem.youtube.indexOf('channel') !== -1) {
        return true
      }
      noIcos.push(elem)
      return false
    })


    const regex = /.+channel\/(.+)\??\/?/gm

    for (const iterator in filteredIcos) {
      let m

      while ((m = regex.exec(filteredIcos[iterator].youtube)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
          regex.lastIndex++
        }
        if (m[1].indexOf('/') !== -1 || m[1].indexOf('?') !== -1) noIcos.push(filteredIcos[iterator])
        filteredIcos[iterator].youtube = m[1].replace('/', '').replace('?view_as=subscriber', '')
      }
    }
    // var fs = require('fs');
    // var stream = fs.createWriteStream("no_result.json");
    // stream.once('open', function(fd) {
    //     stream.write(JSON.stringify(noIcos));
    //     stream.end();
    // });
    //
    // throw new Error("Sd")


    // let parsedResult = require("../../res.json")
    try {
      logger.info('update youtube ', filteredIcos.length)

      const resultYoutubeArr = await require('./youtube').countFollowers(filteredIcos)

      logger.info(resultYoutubeArr)

      // let resultYoutubeArr = [];
      // for (let i = 0; i < scores.length; i++) {
      //     for (let a = 0; a < filteredIcos.length; a++) {
      //         if (scores[i].id === filteredIcos[a].youtube) {
      //             resultYoutubeArr.push(
      //                 {
      //                     id: scores[i].id,
      //                     subscribers: scores[i].subscribers,
      //                     views: scores[i].views,
      //                     name: filteredIcos[a].name,
      //                     website: filteredIcos[a].website,
      //                     ico_id: filteredIcos[a].id,
      //                     start_date: filteredIcos[a].start_date_ico,
      //                     end_date: filteredIcos[a].end_date_ico,
      //                 })
      //         }
      //     }
      // }


      logger.info('work')
      logger.info(resultYoutubeArr.length)

      var fs = require('fs');
      var stream = fs.createWriteStream("result.json");
      stream.once('open', function(fd) {
          stream.write(JSON.stringify(resultYoutubeArr));
          stream.end();
      });
      const updatedYouTubeIcosScore = insertYoutubeScoreToDB_(resultYoutubeArr)

      resolve(updatedYouTubeIcosScore)
    } catch (e) {
      reject(e)
    }


    // console.log(resultYoutubeArr.length,"results.....")
    //
    // fs.appendFileSync('good.json', '[');
    //
    //
    //
    //
    // for(let i =0;i < resultYoutubeArr.length;i++){
    //     fs.appendFileSync('good.json', JSON.stringify(resultYoutubeArr[i]) + ',');
    // }
    //
    // fs.appendFileSync('good.json', ']');


    // let updatedYouTubeIcosScore = insertYoutubeScoreToDB_(resultYoutubeArr)

    // console.log(updatedYouTubeIcosScore)
    // fs.writeFileSync('result_goods.json', JSON.stringify(resultYoutubeArr));

    // var wstream = fs.createWriteStream('result_goods.json', {flags: 'a'});
    // wstream.write(JSON.stringify(resultYoutubeArr));
    // wstream.end();
    // console.log(JSON.stringify(resultYoutubeArr))
  }))
}

/**
 * Insert score to Table `exchange_ranks`
 * @param exchange - Object
 * @private
 */
let insertYoutubeScoreToDB_ = function (icos) {
  const sequelize = prodIcowalletInstance()

  for (let i = 0; i < icos.length; i++) {
    sequelize.query(`update icos_scores set youtube_followers = ${icos[i].subscribers}, youtube_views = ${icos[i].views} where ico_id = ${icos[i].ico_id} order by created_at desc limit 1`)
      .spread((result, metadata) => {
        // console.log(i, icos[i].name,result)
      })
  }
  return true
}
/**
 * Update ICOs Scores every day
 * @private
 */
const updateIcoScores_ = async function () {
  const icos = await getNotFinishedIcos_()

  sendSlackNotifyEvent_({}, `start web crawling '${icos.length}' icos on. ${os.hostname()} with ui division by ${division}`, 'header', '#439FE0')
  const analyticsDTO = {
    telegram: { contentError: 0, serverError: 0, parsed: 0, customError: 0, _averageTime: 0 },
    bitcointalk: { contentError: 0, serverError: 0, parsed: 0, customError: 0, _averageTime: 0 },
    twitter: { contentError: 0, serverError: 0, parsed: 0, customError: 0, _averageTime: 0 },
    facebook: { contentError: 0, serverError: 0, parsed: 0, customError: 0, _averageTime: 0 },
    reddit: { contentError: 0, serverError: 0, parsed: 0, customError: 0, _averageTime: 0 },
    medium: { contentError: 0, serverError: 0, parsed: 0, customError: 0, _averageTime: 0 },
    bing: { contentError: 0, serverError: 0, parsed: 0, customError: 0, _averageTime: 0 },
    alexa_rank: { contentError: 0, serverError: 0, parsed: 0, customError: 0, _averageTime: 0 },
  }

  if (icos.length > 0) {
    const avgChunkExecTime = []; let countPidOperations = 0; let
      countChunkStats = null

    for (const iterator in icos) {
      simpleWaitTransaction(2000)
      const localTime = Date.now()
      const icoStatsObj = await updateIco_(icos[iterator])
      const timeSpent = (Date.now() - localTime) / 1000

      for (const _mediaSrc in icoStatsObj) {
        if (icoStatsObj.hasOwnProperty(_mediaSrc) && analyticsDTO.hasOwnProperty(_mediaSrc)) {
          icoStatsObj[_mediaSrc] = (!isNaN(parseFloat(icoStatsObj[_mediaSrc]))
                        && isFinite(icoStatsObj[_mediaSrc])) ? icoStatsObj[_mediaSrc] : -5

          switch (icoStatsObj[_mediaSrc]) {
            case -1:
              analyticsDTO[_mediaSrc].contentError++
              break
            case -2:
              analyticsDTO[_mediaSrc].serverError++
              break
            default:
              if (icoStatsObj[_mediaSrc] !== undefined && icoStatsObj[_mediaSrc] > 0) {
                analyticsDTO[_mediaSrc].parsed++
              }
              if (icoStatsObj[_mediaSrc] !== undefined && icoStatsObj[_mediaSrc] < 0) {
                analyticsDTO[_mediaSrc].customError++
              }
              break
          }
          if (!countChunkStats || (countPidOperations % division) == 0) {
            analyticsDTO[_mediaSrc]._averageTime = avgChunkExecTime.join('').length / avgChunkExecTime.length
          }
        }
      }
      avgChunkExecTime.push(timeSpent)
      countPidOperations++


      // logger.info(countPidOperations );
      if ((countPidOperations % division) == 0) {
        console.log(`${countPidOperations} .........`)
        countChunkStats = countPidOperations
        sendSlackNotifyEvent_(analyticsDTO, '', `currently processed: ${countPidOperations} of: ${icos.length}`, '#e00032')
        simpleWaitTransaction(300000)
      }
    }
  } else {
    slack.note('parser did not worked because of no ico in query result')
  }
  _dayIterator++
}

/**
 * Update Pinned Messages
 * @private
 */
const updatePinnedMsgs_ = async function () {
  const icos = await getNotFinishedIcos_()

  sendSlackNotifyEvent_({}, `pinned messages for '${icos.length}' ico on. ${os.hostname()} `, 'header', '#e00009')
  const analyticsDTO = {
    telegram: { allProjects: 0, projectsWithPins: 0, projectsWithNoPins: 0, projectsWithUpdatedPins: 0 },
  }
  if (icos.length > 0) {
    for (const iterator in icos) {
      const localTime = Date.now()
      const icoStatsObj = await updateIco_(icos[iterator])
      const timeSpent = (Date.now() - localTime) / 1000

    }

  }


  if (icos.length > 0) {
    const avgChunkExecTime = []; let countPidOperations = 0; let
      countChunkStats = null

    for (const iterator in icos) {
      simpleWaitTransaction(2000)
      const localTime = Date.now()
      const icoStatsObj = await updateIco_(icos[iterator])
      const timeSpent = (Date.now() - localTime) / 1000

      for (const _mediaSrc in icoStatsObj) {
        if (icoStatsObj.hasOwnProperty(_mediaSrc) && analyticsDTO.hasOwnProperty(_mediaSrc)) {
          icoStatsObj[_mediaSrc] = (!isNaN(parseFloat(icoStatsObj[_mediaSrc]))
            && isFinite(icoStatsObj[_mediaSrc])) ? icoStatsObj[_mediaSrc] : -5

          switch (icoStatsObj[_mediaSrc]) {
            case -1:
              analyticsDTO[_mediaSrc].contentError++
              break
            case -2:
              analyticsDTO[_mediaSrc].serverError++
              break
            default:
              if (icoStatsObj[_mediaSrc] !== undefined && icoStatsObj[_mediaSrc] > 0) {
                analyticsDTO[_mediaSrc].parsed++
              }
              if (icoStatsObj[_mediaSrc] !== undefined && icoStatsObj[_mediaSrc] < 0) {
                analyticsDTO[_mediaSrc].customError++
              }
              break
          }
          if (!countChunkStats || (countPidOperations % division) == 0) {
            analyticsDTO[_mediaSrc]._averageTime = avgChunkExecTime.join('').length / avgChunkExecTime.length
          }
        }
      }
      avgChunkExecTime.push(timeSpent)
      countPidOperations++


      // logger.info(countPidOperations );
      if ((countPidOperations % division) == 0) {
        console.log(`${countPidOperations} .........`)
        countChunkStats = countPidOperations
        sendSlackNotifyEvent_(analyticsDTO, '', `currently processed: ${countPidOperations} of: ${icos.length}`, '#e00032')
        simpleWaitTransaction(300000)
      }
    }
  } else {
    slack.note('parser did not worked because of no ico in query result')
  }
  _dayIterator++
}

const gracefullHandler = function (options, err) {
  console.log('gracefull shutdown')
  sendSlackNotifyEvent_({}, `stop web crawling icos on. ${os.hostname()}`, 'header', '#439FE0')
  // sendSlackNotifyEvent_({},"gracefull shutdown of web crawling operation","header", "#FF334B");

  if (options.cleanup) {
    console.log('clean')
  }
  if (err) {
    console.log(err.stack)
    console.log('err and clean')
  }
  if (options.exit) {
    console.log('err and clean')
    process.exit()
  }
}


/**
 * Update ICO Scores from request
 * @param ico - Object
 * @returns Object
 * @private
 */
const updateIcoScoresFromRequest_ = async function (ico) {
  ico.scores = await updateIco_(ico)
  delete ico.scores.ico_id
  return ico
}


/**
 * Scraping hype_score every 24 hours
 * @private
 */
const initHypeScore_ = async function () {
  process.stdin.resume()
  process.on('uncaughtException', gracefullHandler.bind(null, { exit: true }))

  await updateScores_()

  setInterval(updateScores_, 1000 * 60 * 60 * process.env.HYPESCORE_SCRAPER_TIME)
}



/**
 * Scraping hype_score every 24 hours
 * @private
 */
const initPinnedMsgs_ = async function () {
  process.stdin.resume()
  process.on('uncaughtException', gracefullHandler.bind(null, { exit: true }))

  await updatePinnedMsgs_()

  setInterval(updatePinnedMsgs_, 1000 * 60 * 60 * process.env.PINNED_MSGS_SCRAPER_TIME)
}

/**
 * Scraping hype_score every 24 hours
 * @private
 */
let updateScores_ = async function () {
  // await updateYoutubeScores_()
  // await updateExchangesScores_()
  await updateIcoScores_()
}


module.exports = {
  init: initHypeScore_,
  pins: initPinnedMsgs_,
  updateScores: updateIcoScoresFromRequest_,
}
