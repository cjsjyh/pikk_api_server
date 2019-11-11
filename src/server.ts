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
import { logWithDate } from "./resolvers/Utils/stringUtil"

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

// async function testfunc() {
//   let htmlCode = await getHtml(
//     "http://www.coor.kr/shop/shopdetail.html?branduid=2578832&xcode=009&mcode=007&scode=&type=X&sort=order&cur_code=009007&GfDT=Z253UA%3D%3D"
//   )
//   let coor_price = parseHtml(htmlCode, "number", "attribute", "#price", "", "value")
//   let coor_saleprice = parseHtml(htmlCode, "number", "attribute", "#disprice", "", "value")
//   let coor_itemname = parseHtml(htmlCode, "string", "value", ".info", ".tit-prd")
//   let coor_image = parseHtml(htmlCode, "string", "attribute", ".prd-detail", "img", "src", 1)
//   console.log(coor_price)
//   console.log(coor_saleprice)
//   console.log(coor_itemname)
//   console.log(coor_image)
// }
// testfunc()

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
