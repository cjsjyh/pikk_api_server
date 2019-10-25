const { Pool } = require("pg")

var pool = new Pool({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,

  max: 4,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 3000
})

module.exports = {
  pool
}
