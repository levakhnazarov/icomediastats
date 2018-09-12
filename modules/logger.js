const winston = require('winston')


const config = winston.config
const filePrefix = `${new Date().getMonth() + 1}-${new Date().getFullYear()}-`

winston.emitErrs = true

module.exports = function () {
  return new winston.Logger({
    transports: [
      new winston.transports.File({
        level: 'error',
        filename: `${process.cwd()}/logs/${filePrefix}errors.log`,
        json: true,
        maxSize: 5242880, // 5mb
      }),
      new winston.transports.Console({
        handleException: false,
        json: false,
        colorize: true,
        timestamp () {
          const date = new Date()


          const addZero_ = function (i) {
            if (i < 10) i = `0${i}`
            return i
          }

          return `[${addZero_(date.getDate())}.${addZero_(date.getMonth() + 1)}.${date.getYear() - 100} ${addZero_(date.getHours())}:${addZero_(date.getMinutes())}:${addZero_(date.getSeconds())}]`
        },
        formatter (options) {
          return `${options.timestamp()} ${
            config.colorize(options.level, options.level.toUpperCase())} ${
            options.message ? options.message : ''}`
        },
      }),
    ],
    exitOnError: false,
  })
}
