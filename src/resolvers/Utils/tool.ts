import { RunSingleSQL, ExtractFieldFromList } from "./promiseUtil"
import { logWithDate } from "./stringUtil"
const fs = require("fs")
const { S3 } = require("../../database/aws_s3")

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

  console.log(filtered)
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
          console.log("Image saved from AWS")
          resolve()
        })
      })
    })

    //Detect Image Size
    var dimensions = sizeOf(`./${filteredUrl}`)
    console.log(dimensions.width, dimensions.height)

    let lowName = filteredUrl.replace(".", "_low.")
    let mediumName = filteredUrl.replace(".", "_medium.")
    let highName = filteredUrl.replace(".", "_high.")

    //Resize Images
    await sharp(`./${filteredUrl}`)
      .resize({ width: 128 })
      .toFile(`./${lowName}`)

    if (dimensions.width < 512) {
      await new Promise((resolve, reject) => {
        let outStream = fs.createWriteStream(`./${mediumName}`)
        fs.createReadStream(`./${filteredUrl}`).pipe(outStream)
        outStream.on("end", () => {
          resolve("end")
        })
        outStream.on("finish", () => {
          resolve("finish")
        })
      })
    } else {
      await sharp(`./${filteredUrl}`)
        .resize({ width: 512 })
        .toFile(`./${mediumName}`)
    }

    if (dimensions.width < 1024) {
      await new Promise((resolve, reject) => {
        let outStream = fs.createWriteStream(`./${highName}`)
        fs.createReadStream(`./${filteredUrl}`).pipe(outStream)
        outStream.on("end", () => {
          resolve("end")
        })
        outStream.on("finish", () => {
          resolve("finish")
        })
      })
    } else {
      await sharp(`./${filteredUrl}`)
        .resize({ width: 1024 })
        .toFile(`./${highName}`)
    }
    console.log("Resizing Done")

    //Upload Image
    ;[lowName, mediumName, highName].forEach(filename => {
      console.log(`Uploading ./${filename}`)
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
