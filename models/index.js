'use strict'

require('dotenv').config()

const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')


const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    dialectOptions: {
      ssl: {
        ca: fs.readFileSync(__dirname + '/../sql.crt.pem'),
      }
    },
    logging: false,
    freezeTableName: true,
    operatorsAliases: false,
  }
)
const db = {}

fs
  .readdirSync(__dirname)
  .filter((file) => (file.indexOf('.') !== 0) && (file !== 'index.js') && (file.slice(-3) === '.js'))
  .forEach((file) => {
    const model = sequelize.import(path.join(__dirname, file))

    db[model.name] = model
  })


Object.keys(db).forEach((modelName) => {
  if ('associate' in db[modelName]) {
    db[modelName].associate(db)
  }
})

db.sequelize = sequelize
db.Sequelize = Sequelize

module.exports = db
