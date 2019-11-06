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
  let imageUrls = await RunSingleSQL(
    'SELECT rec."titleImageUrl" as "imageUrl" from "RECOMMEND_POST" rec'
  )
  imageUrls = ExtractFieldFromList(imageUrls, "imageUrl")
  var filtered = imageUrls.filter(function(el) {
    return el != "null"
  })

  //Extract S3 Key
  for (let i = 0; i < filtered.length; i++) {
    filtered[i] = filtered[i].replace(
      "https://fashiondogam-images.s3.ap-northeast-2.amazonaws.com/",
      ""
    )
  }
  console.log(filtered)

  filtered.forEach(async filteredUrl => {
    //Download From S3
    await new Promise((resolve, reject) => {
      var param = {
        Bucket: "fashiondogam-images",
        Key: filteredUrl
      }

      S3.getObject(param, (err, data) => {
        if (err) {
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
      console.log(`./${filename}`)
      let buffer = readChunk.sync(`./${filename}`, 0, fs.statSync(`./${filename}`)["size"])
      let param2 = {
        Bucket: "fashiondogam-images",
        Key: filename,
        ACL: "public-read",
        Body: fs.createReadStream(`./${filename}`),
        ContentType: imageType(buffer)["mime"]
      }
      S3.upload(param2, function(err: Error, data: AWS.S3.ManagedUpload.SendData) {
        if (err) {
          logWithDate(err)
        }
        let imageUrl = data.Location
        logWithDate("image Upload properly done")
        logWithDate(imageUrl)
      })
    })
  })
}
