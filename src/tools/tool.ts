import { RunSingleSQL, ExtractFieldFromList, Make4VersionsOfImage } from "../resolvers/Utils/promiseUtil"
import { ConvertListToString, replaceLastOccurence } from "../resolvers/Utils/stringUtil"
const { S3 } = require("../database/aws_s3")

const fs = require("fs")
var sizeOf = require("image-size")
const sharp = require("sharp")
const imageType = require("image-type")
const readChunk = require("read-chunk")
var logger = require("../tools/logger")

export async function CombineItem(updateId: number, deleteIds: number[]) {
  try {
    let querySql = `
    WITH update_item as (
      UPDATE "ITEM_REVIEW" SET "FK_itemId" = ${updateId} WHERE "FK_itemId" IN (${ConvertListToString(deleteIds)})
    ),
    delete_item as (
      SELECT "FK_itemGroupId", id FROM "ITEM_VARIATION" WHERE id IN (${ConvertListToString(deleteIds)})
    )
    DELETE FROM "ITEM_GROUP" USING delete_item WHERE "ITEM_GROUP".id = delete_item."FK_itemGroupId"
    `
    await RunSingleSQL(querySql)
  } catch (e) {
    logger.error(e.stack)
  }
}

export async function FindAndCombineDuplicateItem() {
  try {
    let findSql = `
    WITH grr as (
      SELECT var.name, gr."originalPrice" FROM "ITEM_VARIATION" var INNER JOIN "ITEM_GROUP" gr ON var."FK_itemGroupId"=gr.id
    ),
    aaa as (
      SELECT count(*) AS count_ , name, grr."originalPrice" FROM grr 
      GROUP BY "originalPrice", name HAVING count(*) > 1
      ORDER BY count_ DESC
    )
    SELECT * FROM "ITEM_VARIATION" var, aaa WHERE var.name = aaa.name
    ORDER BY var.name ASC, var.id DESC
    `
    let findResult = await RunSingleSQL(findSql)

    let prevName = ""
    let headRecord
    let tailRecord = []
    for (let i = 0; i < findResult.length; i++) {
      if (prevName != findResult[i].name) {
        if (i != 0) await CombineItem(headRecord, tailRecord)
        headRecord = Number(findResult[i].id)
        prevName = findResult[i].name
        tailRecord.length = 0
      } else {
        tailRecord.push(Number(findResult[i].id))
      }
      logger.info("Combination Done!")
    }
  } catch (e) {}
}

export async function CopyImageWithDifferentName() {
  //Get table rows
  //let imageUrls = await RunSingleSQL('SELECT tab."titleImageUrl" as "imageUrl" from "RECOMMEND_POST" tab')
  let imageUrls = []
  let temp = await RunSingleSQL('SELECT tab."imageUrl" as "imageUrl" from "ITEM_VARIATION" tab')
  imageUrls = imageUrls.concat(temp)
  temp = await RunSingleSQL('SELECT tab."channel_titleImgUrl" as "imageUrl" from "USER_INFO" tab')
  imageUrls = imageUrls.concat(temp)
  temp = await RunSingleSQL('SELECT tab."profileImgUrl" as "imageUrl" from "USER_INFO" tab')
  imageUrls = imageUrls.concat(temp)
  temp = await RunSingleSQL('SELECT tab."imageUrl" as "imageUrl" from "ITEM_REVIEW_IMAGE" tab')
  imageUrls = imageUrls.concat(temp)
  imageUrls = ExtractFieldFromList(imageUrls, "imageUrl")
  var filtered = imageUrls.filter(function(el) {
    return el != "null" && el != null
  })

  //Extract S3 Key
  for (let i = 0; i < filtered.length; i++) {
    filtered[i] = filtered[i].replace("https://fashiondogam-images.s3.ap-northeast-2.amazonaws.com/", "")
  }

  filtered.forEach(async destUrl => {
    var params = {
      ACL: "public-read",
      Bucket: "fashiondogam-images",
      CopySource: "fashiondogam-images/" + replaceLastOccurence(destUrl, ".", "_large."),
      Key: decodeURIComponent(destUrl)
    }
    S3.copyObject(params, function(err, data) {
      if (err) logger.error(err)
      else logger.info(destUrl)
    })
  })
}

export async function ReplaceImageWithResolutions() {
  //Get table rows
  let imageUrls = await RunSingleSQL('SELECT tab."titleImageUrl" as "imageUrl" from "RECOMMEND_POST" tab')
  //let imageUrls = await RunSingleSQL(    'SELECT tab."imageUrl" as "imageUrl" from "ITEM_VARIATION" tab'  );
  //let imageUrls = await RunSingleSQL(    'SELECT tab."channel_titleImgUrl" as "imageUrl" from "USER_INFO" tab'  );
  //let imageUrls = await RunSingleSQL(    'SELECT tab."profileImgUrl" as "imageUrl" from "USER_INFO" tab'  );
  //let imageUrls = await RunSingleSQL(    'SELECT tab."imageUrl" as "imageUrl" from "ITEM_REVIEW_IMAGE" tab'  );
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
      //------------------------------------------------------
      //let xsmallName = filteredUrl.replace(".", "_xsmall.");
      let smallName = filteredUrl.replace(".", "_low.")
      let mediumName = filteredUrl.replace(".", "_medium.")
      let largeName = filteredUrl.replace(".", "_high.")
      ;[smallName, largeName].forEach(filename => {
        S3.deleteObject({
          Bucket: "fashiondogam-images",
          Key: filename
        })
          .promise()
          .then(() => {
            logger.info("Successfully Deleted Image")
            //resolve();
          })
          .catch(e => {
            logger.warn("Failed to delete Image")
            logger.error(e.stack)
            //reject(e);
          })
      })
      //------------------------------------------------------

      var param = {
        Bucket: "fashiondogam-images",
        Key: decodeURIComponent(filteredUrl)
      }

      S3.getObject(param, (e, data) => {
        if (e) {
          logger.error(e.stack)
          return
        }
        fs.writeFile(`./${filteredUrl}`, data.Body, function(e) {
          if (e) logger.error(e.stack)
          logger.info("Image saved from AWS")
          resolve()
        })
      })
    })

    //Detect Image Size
    var dimensions = sizeOf(`./${filteredUrl}`)

    let xsmallName = filteredUrl.replace(".", "_xsmall.")
    let smallName = filteredUrl.replace(".", "_small.")
    let mediumName = filteredUrl.replace(".", "_medium.")
    let largeName = filteredUrl.replace(".", "_large.")

    //Resize Images
    await Make4VersionsOfImage(filteredUrl, dimensions, xsmallName, smallName, mediumName, largeName)

    //Upload Images
    ;[xsmallName, smallName, mediumName, largeName].forEach(filename => {
      let cutfilename = filename.replace("image/", "")
      let buffer = readChunk.sync(`./${filename}`, 0, fs.statSync(`./${filename}`)["size"])
      let param2 = {
        Bucket: "fashiondogam-images",
        Key: decodeURIComponent(filename),
        ACL: "public-read",
        Body: fs.createReadStream(`./${filename}`),
        ContentType: imageType(buffer)["mime"]
      }
      S3.upload(param2, function(e: Error, data: AWS.S3.ManagedUpload.SendData) {
        if (e) {
          logger.error(e.stack)
        }
        let imageUrl = data.Location
        logger.info(imageUrl)
      })
    })
    /*
    await Promise.all(
      [filteredUrl, xsmallName, smallName, mediumName, largeName].map(
        filename => {
          return new Promise((resolve, reject) => {
            fs.unlink(filename, function(e) {
              if (e) reject(e);
              resolve();
            });
          });
        }
      )
    );
    */
  })
}
