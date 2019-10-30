//IMPORT CORE PACKAGES
import express from "express"
import { ApolloServer } from "apollo-server-express"
import { createServer } from "http"
import compression from "compression"
import cors from "cors"
const path = require("path")
var jwt = require("jsonwebtoken")
require("dotenv").config()

//IMPORT GRAPHQL RELATED PACKAGES
import depthLimit from "graphql-depth-limit"
import schema from "./schema"

//-------------------------------
//TEMPORARY IMPORT FOR TESTING
//-------------------------------
import * as fs from "fs"
import { logWithDate } from "./resolvers/Utils/stringUtil"
const { pool } = require("./database/connectionPool")

//Create Express Server
const app = express()

app.use(function(req, res, next) {
  req.headers.origin = req.headers.origin || req.headers.host
  next()
})

const corsOptions = require("./middleware/cors")
app.use("*", cors(corsOptions))

let limiter
if (process.env.MODE == "DEPLOY") {
  limiter = require("./middleware/rateLimiter")
  app.use(limiter.rateLimiterRedisMiddleware)
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

const httpServer = createServer(app)
httpServer.listen({ port: 80 }, (): void => logWithDate(`GraphQL is now running on http://localhost:80/graphql`))

process.on("SIGINT", async function() {
  await pool.end()
  if (process.env.MODE == "DEPLOY") {
    limiter.redisClient.quit()
  }
  httpServer.close(function() {
    process.exit(0)
  })
})
