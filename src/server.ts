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

//Create Express Server
const app = express()

app.use(function(req, res, next) {
  req.headers.origin = req.headers.origin || req.headers.host
  next()
})
var whitelist = [
  "https://pickk.one",
  "http://pickk.one",
  "https://pickkapiserver.online",
  "http://pickkapiserver.online",
  "https://pickkcli.greatsumini.now.sh"
]
var corsOptions = {
  origin: function(origin, callback) {
    if (process.env.MODE == "DEVELOPMENT") callback(null, true)
    else {
      if (whitelist.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        console.log(`[CORS] ${origin} Not allowed by CORS`)
        callback(new Error("Not allowed by CORS"))
      }
    }
  }
}
app.use("*", cors(corsOptions))

if (process.env.MODE != "DEVELOPMENT") {
  const rateLimiterRedisMiddleware = require("./database/rateLimiter")
  app.use(rateLimiterRedisMiddleware)
}
app.use(require("express-status-monitor")())
app.use(compression())

//Create Apollo Server
const server = new ApolloServer({
  schema,
  context: ({ req }) => {
    if (process.env.MODE == "DEVELOPMENT") return { IsVerified: true }

    const header: any = req.headers
    if (!Object.prototype.hasOwnProperty.call(header, "authorizationtoken") || !Object.prototype.hasOwnProperty.call(header, "authorizationuserid"))
      return { IsVerified: false }
    else if (header.authorizationtoken == "undefined" || header.authorizationuserid == "undefined") return { IsVerified: false }

    try {
      var decoded = jwt.verify(header.authorizationtoken, process.env.PICKK_SECRET_KEY)
    } catch (e) {
      console.log(e)
      return { IsVerified: false }
    }
    let isVerified = false
    if (decoded == header.authorizationuserid) isVerified = true
    return {
      IsVerified: isVerified,
      userId: decoded
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
httpServer.listen({ port: 80 }, (): void => console.log(`GraphQL is now running on http://localhost:80/graphql`))
