//IMPORT CORE PACKAGES
import express from "express"
import { ApolloServer } from "apollo-server-express"
import { createServer } from "http"
import compression from "compression"
import cors from "cors"
const path = require("path")
require("dotenv").config()

//IMPORT GRAPHQL RELATED PACKAGES
import depthLimit from "graphql-depth-limit"
import schema from "./schema"

//IMPORT S3
import * as AWS from "aws-sdk"
//AWS.config.loadFromPath(path.join(__dirname, "/../config.json"))
const S3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "ap-northeast-2"
})

//-------------------------------
//TEMPORARY IMPORT FOR TESTING
//-------------------------------
import * as fs from "fs"
import { QueryResult, PoolClient } from "pg"

//Create Express Server
const app = express()
app.use("*", cors())
app.use(compression())

//Create Apollo Server
const server = new ApolloServer({
  schema,
  validationRules: [depthLimit(5)]
})

//Add graphql endpoint to Express
server.applyMiddleware({ app, path: "/graphql" })

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
