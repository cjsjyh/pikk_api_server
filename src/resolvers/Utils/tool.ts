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
  let imageUrls = await RunSingleSQL('SELECT rec."titleImageUrl" as "imageUrl" from "RECOMMEND_POST" rec')
  imageUrls = ExtractFieldFromList(imageUrls, "imageUrl")
  var filtered = imageUrls.filter(function(el) {
    return el != "null"
  })

  //Extract S3 Key
  for (let i = 0; i < filtered.length; i++) {
    filtered[i] = filtered[i].replace("https://fashiondogam-images.s3.ap-northeast-2.amazonaws.com/", "")
  }
  console.log(filtered)

  //Download From S3
  var param = {
    Bucket: "fashiondogam-images",
    Key: filtered[0]
  }
  S3.getObject(param, (err, data) => {
    if (err) {
      logWithDate(err)
      return
    }
    fs.writeFile(`./${filtered[0]}`, data.Body, function(err) {
      if (err) logWithDate(err)
    })
  })

  //Detect Image Size
  var dimensions = sizeOf(`./${filtered[0]}`)
  console.log(dimensions.width, dimensions.height)
  let lowName = filtered[0].replace(".", "_low.")
  let mediumName = filtered[0].replace(".", "_medium.")
  let highName = filtered[0].replace(".", "_high.")

  //Resize Images
  await sharp(`./${filtered[0]}`)
    .resize({ width: 128 })
    .toFile(`./${lowName}`)

  if (dimensions.width < 512) {
    fs.createReadStream(`./${filtered[0]}`).pipe(fs.createWriteStream(`./${mediumName}`))
  } else {
    await sharp(`./${filtered[0]}`)
      .resize({ width: 512 })
      .toFile(`./${mediumName}`)
  }

  if (dimensions.width < 1024) {
    fs.createReadStream(`./${filtered[0]}`).pipe(fs.createWriteStream(`./${highName}`))
  } else {
    await sharp(`./${filtered[0]}`)
      .resize({ width: 1024 })
      .toFile(`./${highName}`)
  }

  let buffer = readChunk.sync(`./${filtered[0]}`, 0, fs.statSync(`./${filtered[0]}`)["size"])
  //Upload Image
  var param2 = {
    Bucket: "fashiondogam-images",
    Key: lowName,
    ACL: "public-read",
    Body: fs.createReadStream(`./${lowName}`),
    ContentType: imageType(buffer)["mime"]
  }

  console.log(`./${lowName}`)
  console.log(`./${filtered[0]}`)
  console.log(fs.createReadStream(`./${lowName}`))

  S3.upload(param2, function(err: Error, data: AWS.S3.ManagedUpload.SendData) {
    if (err) {
      logWithDate(err)
    }
    let imageUrl = data.Location
    logWithDate("image Upload properly done")
    logWithDate(imageUrl)
  })

  //Delete Image
}
