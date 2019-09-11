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
app.use("*", cors())
app.use(compression())

//Create Apollo Server
const server = new ApolloServer({
  schema,
  context: ({ req }) => {
    if (process.env.MODE == "DEVELOPMENT") return { IsVerified: true }

    const header: any = req.headers
    if (!Object.prototype.hasOwnProperty.call(header, "authorizationtoken") || !Object.prototype.hasOwnProperty.call(header, "authorizationuserid"))
      return { IsVerified: false }
    var decoded = jwt.verify(header.authorizationtoken, process.env.PICKK_SECRET_KEY)

    let isVerified = false
    if (decoded == header.authorizationuserid) isVerified = true
    return { IsVerified: isVerified }
  },
  validationRules: [depthLimit(5)]
})

//Add graphql endpoint to Express
server.applyMiddleware({ app, path: "/graphql" })

app.get("/", (req: express.Request, res: express.Response) => {
  res.send("TEST")
})

app.get("/UploadImage", async (req: express.Request, res: express.Response) => {
  var param = {
    Bucket: "fashiondogam-images",
    Key: "image/" + "testimage.jpg",
    ACL: "public-read",
    Body: fs.createReadStream(__dirname + "/../test.jpg"),
    ContentType: "image/jpg"
  }

  S3.upload(param, function(err: Error, data: AWS.S3.ManagedUpload.SendData) {
    if (err) {
      console.log(err)
    }
    console.log(data)
  })
})

const httpServer = createServer(app)
httpServer.listen({ port: 3000 }, (): void => console.log(`GraphQL is now running on http://localhost:3000/graphql`))
