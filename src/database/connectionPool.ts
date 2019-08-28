const { Pool } = require("pg")
const pool = new Pool({
  user: process.env.RDS_USERNAME,
  host: process.env.RDS_HOST,
  database: "postgres",
  password: process.env.RDS_PASSWORD,
  port: process.env.RDS_PORT,

  max: 8,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
})

module.exports = {
  pool
}
