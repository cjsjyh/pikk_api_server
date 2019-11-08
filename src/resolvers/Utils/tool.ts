import { RunSingleSQL, ExtractFieldFromList, Make3VersionsOfImage } from "./promiseUtil"
import { logWithDate } from "./stringUtil"
const { S3 } = require("../../database/aws_s3")

const fs = require("fs")
var sizeOf = require("image-size")
const sharp = require("sharp")
const imageType = require("image-type")
const readChunk = require("read-chunk")

export async function ReplaceImageWithResolutions() {
  //Get table rows
  let imageUrls = await RunSingleSQL('SELECT tab."channel_titleImgUrl" as "imageUrl" from "USER_INFO" tab')
  imageUrls = ExtractFieldFromList(imageUrls, "imageUrl")
  var filtered = imageUrls.filter(function(el) {
    return el != "null" && el != null
  })

  //Extract S3 Key
  for (let i = 0; i < filtered.length; i++) {
    filtered[i] = filtered[i].replace("https://fashiondogam-images.s3.ap-northeast-2.amazonaws.com/", "")
  }

  filtered.forEach(async filteredUrl => {
    //Download From S3
    await new Promise((resolve, reject) => {
      /*
      let lowName = filteredUrl.replace(".", "_low.")
      let mediumName = filteredUrl.replace(".", "_medium.")
      let highName = filteredUrl.replace(".", "_high.")
      ;[lowName, mediumName, highName].forEach(filename => {
        S3.deleteObject({
          Bucket: "fashiondogam-images",
          Key: filename
        })
          .promise()
          .then(() => {
            console.log(filename)
            logWithDate("Successfully Deleted Image")
            resolve()
          })
          .catch(e => {
            logWithDate("[Error] Failed to delete Image")
            logWithDate(e)
            reject(e)
          })
      })
      */

      var param = {
        Bucket: "fashiondogam-images",
        Key: decodeURIComponent(filteredUrl)
      }

      S3.getObject(param, (err, data) => {
        if (err) {
          logWithDate(decodeURIComponent(filteredUrl))
          logWithDate(err)
          return
        }
        fs.writeFile(`./${filteredUrl}`, data.Body, function(err) {
          if (err) logWithDate(err)
          logWithDate("Image saved from AWS")
          resolve()
        })
      })
    })

    //Detect Image Size
    var dimensions = sizeOf(`./${filteredUrl}`)

    let lowName = filteredUrl.replace(".", "_low.")
    let mediumName = filteredUrl.replace(".", "_medium.")
    let highName = filteredUrl.replace(".", "_high.")

    //Resize Images
    await Make3VersionsOfImage(filteredUrl, dimensions, lowName, mediumName, highName)

    //Upload Images
    ;[lowName, mediumName, highName].forEach(filename => {
      logWithDate(`Uploading ./${filename}`)
      let cutfilename = filename.replace("image/", "")
      let buffer = readChunk.sync(`./${filename}`, 0, fs.statSync(`./${filename}`)["size"])
      let param2 = {
        Bucket: "fashiondogam-images",
        Key: decodeURIComponent(filename),
        ACL: "public-read",
        Body: fs.createReadStream(`./${filename}`),
        ContentType: imageType(buffer)["mime"]
      }
      S3.upload(param2, function(err: Error, data: AWS.S3.ManagedUpload.SendData) {
        if (err) {
          logWithDate(err)
        }
        let imageUrl = data.Location
        logWithDate(imageUrl)
      })
    })
  })
}
