import * as AWS from "aws-sdk"
var S3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "ap-northeast-2"
})

module.exports = {
  S3
}
