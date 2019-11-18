//IMPORT CORE PACKAGES
import express from "express"
import { ApolloServer } from "apollo-server-express"
import { createServer } from "http"
import compression from "compression"
const path = require("path")

//Security
import cors from "cors"
var jwt = require("jsonwebtoken")
require("dotenv").config()

//Utility
import { logWithDate } from "./resolvers/Utils/stringUtil"
var cron = require("node-cron")

//IMPORT GRAPHQL RELATED PACKAGES
import depthLimit from "graphql-depth-limit"
import schema from "./schema"

//-------------------------------
//TEMPORARY IMPORT FOR TESTING
//-------------------------------
import { InsertIntoNotificationQueue, ProcessNotificationQueue } from "./resolvers/Notification/util"
import { CombineItem } from "./resolvers/Utils/tool"

//Create Express Server
const app = express()

app.use(function(req, res, next) {
  req.headers.origin = req.headers.origin || req.headers.host
  next()
})

const corsOptions = require("./middleware/cors")
app.use("*", cors(corsOptions))

if (process.env.MODE == "DEPLOY") {
  const rateLimiterRedisMiddleware = require("./middleware/rateLimiter")
  app.use(rateLimiterRedisMiddleware)
}
app.use(require("express-status-monitor")())
app.use(compression())

//Create Apollo Server
const server = new ApolloServer({
  schema,

  context: ({ req }) => {
    const header: any = req.headers
    if (!Object.prototype.hasOwnProperty.call(header, "authorizationtoken") || !Object.prototype.hasOwnProperty.call(header, "authorizationuserid")) {
      return { IsVerified: false }
    } else if (header.authorizationtoken == "undefined" || header.authorizationuserid == "undefined") {
      return { IsVerified: false }
    }

    try {
      var decoded = jwt.verify(header.authorizationtoken, process.env.PICKK_SECRET_KEY)
    } catch (e) {
      logWithDate("[Error] Failed to Verify JWT Token")
      logWithDate(e)
      return { IsVerified: false }
    }
    let IsVerified = false
    if (decoded.id == header.authorizationuserid) IsVerified = true

    return {
      IsVerified: IsVerified,
      userId: decoded.id
    }
  },

  validationRules: [depthLimit(5)]
})

//Add graphql endpoint to Express
server.applyMiddleware({ app, path: "/graphql" })

app.get("/", (req: express.Request, res: express.Response) => {
  res.send("TEST")
})

// let elastic = require("./database/elastic/elasticConnect")
// async function testfunc() {
//   let result = await elastic.InsertElasticSearch(elastic.elasticClient, "...customer", ["name", "characteristics"], ["Junsoo", "very good blue"])
//   await elastic.elasticClient.indices.refresh({ index: "...customer" })
//   result = await elastic.SearchElasticSearch(elastic.elasticClient, "...customer", "characteristics", "blue")
// }
// testfunc()

cron.schedule("*/2 * * * *", function() {
  ProcessNotificationQueue()
})

const httpServer = createServer(app)
httpServer.listen({ port: 80 }, (): void => logWithDate(`GraphQL is now running on http://localhost:80/graphql`))

/*
process.on("SIGINT", async function() {
  await pool.end()
  
  if (process.env.MODE == "DEPLOY") {
    limiter.redisClient.quit()
  }
  httpServer.close(function() {
    process.exit(0)
  })
  
})
*/
