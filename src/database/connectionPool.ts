const { Client } = require("pg")
const client = new Client({
  user: process.env.RDS_USERNAME,
  host: process.env.RDS_HOST,
  database: "postgres",
  password: process.env.RDS_PASSWORD,
  port: process.env.RDS_PORT
})

module.exports = {
  client
}
