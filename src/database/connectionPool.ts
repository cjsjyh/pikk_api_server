const { Pool } = require("pg")

const pool = new Pool({
  user: process.env.RDS_USERNAME,
  host: process.env.RDS_HOST,
  database: "postgres",
  password: process.env.RDS_PASSWORD,
  port: process.env.RDS_PORT,

  max: 8,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 3000
})

module.exports = {
  pool
}
