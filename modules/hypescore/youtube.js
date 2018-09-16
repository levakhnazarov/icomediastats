const { google } = require('googleapis')
const logger = require('../logger')()


function channelsListById (links, client) {
  return new Promise((async (resolve, reject) => {
    const idd = links.map((e) => e.youtube)


    const wholeResponce = []

    const auth = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_CLIENT_REDIRECT_URI,
    )


    auth.credentials = {
      access_token: process.env.YOUTUBE_TOKEN,
      token_type: 'Bearer',
      scope: 'https://www.googleapis.com/auth/youtube',
      expiry_date: process.env.YOUTUBE_TIMESTAMP,
    }

    const youtube = google.youtube({
      version: 'v3',
      auth,
    })


    let x = 0
    var loopArray = function (arr, call) {
      getChannelsInfo(arr[x], call, (call, success, views = 0, subscribers = 0) => {
        const icoResult = { id: arr[x], views, subscribers }

        wholeResponce.push(icoResult)
        x++
        if (x < arr.length) {
          loopArray(arr, call)
        } else {
          call(wholeResponce)

          // console.log("whole");
          // var fs = require('fs');
          // var stream = fs.createWriteStream("res.json");
          // stream.once('open', function(fd) {
          //     stream.write(JSON.stringify(wholeResponce));
          //     stream.end();
          // });
        }
      })
    }

    var getChannelsInfo = function (ico, call, callback) {
      youtube.channels.list({
        id: ico,
        part: 'snippet,contentDetails,statistics',
      }, (err, response) => {
        if (err || response.data.items.length === 0) {
          if (err){
          console.log(ico, '-', err.message)
          }
          // if(err) console.log(err)
          callback(call, false)

          // reject(err)
        } else {
          const views = response.data.items[0].statistics.viewCount
          const subscribers = response.data.items[0].statistics.subscriberCount
          console.log(ico, '-views:', views, ' -subs:',subscribers)

          callback(call, true, views, subscribers)
        }
        // resolve (response.data);
      })
    }


    loopArray(idd, (data) => {
      resolve(data)
    })
  }))
}


const countFollowers_ = async function (filteredIcos) {
  return new Promise((async (resolve, reject) => {
    try {
      // let client = await new SampleClient().authenticate(['https://www.googleapis.com/auth/youtube'])

      const scores = await channelsListById(filteredIcos)

      const resultYoutubeArr = []

      logger.info(scores.length)
      for (let i = 0; i < scores.length; i++) {
        for (let a = 0; a < filteredIcos.length; a++) {
          if (scores[i].id === filteredIcos[a].youtube) {
            const score = {
              id: scores[i].id,
              subscribers: scores[i].subscribers,
              views: scores[i].views,
              name: filteredIcos[a].name,
              website: filteredIcos[a].website,
              ico_id: filteredIcos[a].id,
              start_date: filteredIcos[a].start_date_ico,
              end_date: filteredIcos[a].end_date_ico,
            }


            resultYoutubeArr.push(score)
          }
        }
      }
      resolve(resultYoutubeArr)
    } catch (e) {
      reject(e)
    }
  }))
}

module.exports = {

  countFollowers: countFollowers_,

}

