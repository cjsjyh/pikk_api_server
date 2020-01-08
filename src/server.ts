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
var logger = require("./tools/logger")
var cron = require("node-cron")

//IMPORT GRAPHQL RELATED PACKAGES
import depthLimit from "graphql-depth-limit"
import schema from "./schema"

//Constants
const port = 80

//-------------------------------
//TEMPORARY IMPORT FOR TESTING
//-------------------------------
import {
  InsertIntoNotificationQueue,
  ProcessNotificationQueue
} from "./resolvers/Notification/util"
import { CopyImageWithDifferentName } from "./tools/tool"
import { DeployImageBy4Versions } from "./resolvers/Utils/promiseUtil"
import { VerifyJWT } from "./resolvers/Utils/securityUtil"

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
app.use(compression())

//Create Apollo Server
const server = new ApolloServer({
  schema,
  context: ({ req }) => {
    const header: any = req.headers
    if (
      !Object.prototype.hasOwnProperty.call(header, "authorizationtoken") ||
      !Object.prototype.hasOwnProperty.call(header, "authorizationuserid")
    ) {
      return { IsVerified: false }
    } else if (!header.authorizationtoken || !header.authorizationuserid) {
      return { IsVerified: false }
    }

    let IsVerified = VerifyJWT(header.authorizationtoken, header.authorizationuserid)

    return {
      IsVerified: IsVerified,
      userId: header.authorizationuserid
    }
  },

  validationRules: [depthLimit(5)]
})

//Add graphql endpoint to Express
server.applyMiddleware({ app, path: "/graphql" })

app.get("/", (req: express.Request, res: express.Response) => {
  res.send("TEST")
})

// async function testfunc() {
//   const request = require("request")
//   // await request("https://musinsaapp.page.link/ufpBJAk3YoE6krGk9", function(e, response) {
//   //   console.log(response.request.uri.href)
//   // })
// }
// testfunc()

cron.schedule("*/1 * * * *", function() {
  ProcessNotificationQueue()
})

const httpServer = createServer(app)
httpServer.listen({ port: port }, (): void =>
  logger.info(`GraphQL is now running on http://localhost:${port}/graphql`)
)

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
