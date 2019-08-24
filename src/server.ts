//IMPORT CORE PACKAGES
import express from "express"
import { ApolloServer } from "apollo-server-express"
import { createServer } from "http"
import compression from "compression"
import cors from "cors"
const path = require("path")

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

//Create Express Server
const app = express()
app.use("*", cors())
app.use(compression())

//Create Apollo Server
const server = new ApolloServer({
  schema,
  validationRules: [depthLimit(7)]
})

const { Client } = require("pg")
const client = new Client({
  user: process.env.RDS_USERNAME,
  host: process.env.RDS_HOST,
  database: "postgres",
  password: process.env.RDS_PASSWORD,
  port: process.env.RDS_PORT
})
client.connect()
client.query(
  'SELECT * FROM "USER_CONFIDENTIAL"',
  (err: Error, res: Response) => {
    console.log(err, res)
    client.end()
  }
)

//Add graphql endpoint to Express
server.applyMiddleware({ app, path: "/graphql" })

app.get("/UploadImage", async (req, res) => {
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
httpServer.listen({ port: 3000 }, (): void =>
  console.log(`GraphQL is now running on http://localhost:3000/graphql`)
)
