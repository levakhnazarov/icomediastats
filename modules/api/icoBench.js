'use strict'

require('dotenv').config()

const request = require('request')
const CryptoJS = require('crypto-js')


module.exports = class {
  constructor () {
    this.publicKey = process.env.ICOBENCH_PUBLIC_KEY
    this.privateKey = process.env.ICOBENCH_PRIVATE_KEY
    this.apiUrl = 'https://icobench.com/api/v1/'
  }

  get (action, callback, data = {}) {
    const dataJSON = JSON.stringify(data)

    let sign = CryptoJS.HmacSHA384(dataJSON, this.privateKey)

    sign = CryptoJS.enc.Base64.stringify(sign)

    request.post(this.apiUrl + action, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-ICObench-Key': this.publicKey,
        'X-ICObench-Sig': sign,
      },
      forever: true,
      json: data,
    }, (error, response, body) => {
      if (error === null) {
        callback(body)
      }
    })
  }
}
