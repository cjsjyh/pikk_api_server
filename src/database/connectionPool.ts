const { Pool } = require("pg")

var pool
if (process.env.MODE == "DEPLOY") {
  pool = new Pool({
    user: process.env.RDS_USERNAME,
    host: process.env.DBEC2_HOST,
    database: "postgres",
    password: process.env.RDS_PASSWORD,
    port: process.env.RDS_PORT,

    max: 4,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 3000
  })
} else {
  pool = new Pool({
    user: process.env.RDS_USERNAME,
    host: process.env.DBEC2_HOST,
    database: "postgres_development",
    password: process.env.RDS_PASSWORD,
    port: process.env.RDS_PORT,

    max: 4,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 3000
  })
}
module.exports = {
  pool
}
