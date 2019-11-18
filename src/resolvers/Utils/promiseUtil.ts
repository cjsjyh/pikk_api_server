let { pool, resetPool } = require("../../database/connectionPool")
const { S3 } = require("../../database/aws_s3")
const fs = require("fs")
var sizeOf = require("image-size")
const sharp = require("sharp")
const imageType = require("image-type")
const readChunk = require("read-chunk")

import * as AWS from "aws-sdk"
import { getFormatDate, getFormatHour, logWithDate } from "./stringUtil"

export async function SequentialPromiseValue<T, U>(arr: T[], func: Function, args: Array<U> = []): Promise<any> {
  return new Promise(async (resolve, reject) => {
    try {
      let resultArr = new Array<T>(arr.length)
      await Promise.all(
        arr.map((item: any, index: number) => {
          return new Promise(async (resolve, reject) => {
            try {
              let result = await func(item, args)
              resultArr[index] = result
              resolve()
            } catch (e) {
              reject(e)
            }
          })
        })
      )
      resolve(resultArr)
    } catch (e) {
      reject()
    }
  })
}

export function MakeGroups(data: any, groupBy: string, groupIdList: number[]): any {
  let resultArray = []
  groupIdList.forEach(groupId => {
    let currentArray = []
    data.forEach(datum => {
      if (datum[groupBy] == groupId) {
        currentArray.push(datum)
      }
    })
    resultArray.push(currentArray)
  })

  return resultArray
}

export function AssignGroupsToParent(parentsGroup: any, groups: any, parentId: string, parentField: string, depth: number) {
  groups.forEach(item => {
    if (item.length == 0) return
    if (depth == 2) {
      parentsGroup.forEach(parents => {
        parents.forEach(parent => {
          if (parent.id == item[0][parentId]) parent[parentField] = item
        })
      })
    } else {
      parentsGroup.forEach(parent => {
        if (parent.id == item[0][parentId]) parent[parentField] = item
      })
    }
  })
}

export function RunSingleSQL(sql: string, args?: any): Promise<any> {
  return new Promise(async (resolve, reject) => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      //Try to reconnect Pool
      try {
        pool = resetPool()
        client = await pool.connect()
      } catch (e) {
        logWithDate("[Error] Failed to Connect to DB")
        logWithDate(e)
        throw new Error("[Error] Failed Connecting to DB")
      }
    }

    try {
      let queryResult
      if (args == null) queryResult = await client.query(sql)
      else queryResult = await client.query(sql, args)

      client.release()
      resolve(queryResult.rows)
    } catch (e) {
      client.release()
      logWithDate(e)
      reject("Failed")
    }
  })
}

export async function GetMetaData(tableName: string): Promise<number> {
  let rows = await RunSingleSQL(`SELECT COUNT(*) FROM "${tableName}"`)
  return rows[0].count
}

export function ExtractSelectionSet(info: any): any {
  if (info.selectionSet === undefined) return []

  let selectionset = info.selectionSet.selections
  let result: string[] = []
  selectionset.forEach((element: any) => {
    result.push(element.name.value)
    if (element.selectionSet !== undefined) {
      result.push(ExtractSelectionSet(element))
    }
  })
  return result
}

export async function UploadImageWrapper(imgObj: any): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      let url = await UploadImageTemp(imgObj)
      resolve(url)
    } catch (e) {
      reject(0)
    }
  })
}

export async function DeployImageBy3Version(imageUrl: string): Promise<string> {
  let folderName = "image"
  if (process.env.MODE != "DEPLOY") folderName = "testimage"

  try {
    imageUrl = imageUrl.replace(`https://fashiondogam-images.s3.ap-northeast-2.amazonaws.com/${folderName}_temp/`, "")
    //Download Image
    await new Promise((resolve, reject) => {
      var param = {
        Bucket: "fashiondogam-images",
        Key: decodeURIComponent(`${folderName}_temp/${imageUrl}`)
      }
      S3.getObject(param, (err, data) => {
        if (err) {
          logWithDate(err)
          reject(err)
        }
        fs.writeFile(`./${imageUrl}`, data.Body, function(err) {
          if (err) logWithDate(err)
          resolve()
        })
      })
    })

    //Make 3sizes
    var dimensions = sizeOf(`./${imageUrl}`)

    let xsmallName = imageUrl.replace(".", "_xsmall.")
    let smallName = imageUrl.replace(".", "_small.")
    let mediumName = imageUrl.replace(".", "_medium.")
    let largeName = imageUrl.replace(".", "_large.")

    await Make4VersionsOfImage(imageUrl, dimensions, xsmallName, smallName, mediumName, largeName)

    //Upload 3Images
    await Promise.all(
      [xsmallName, smallName, mediumName, largeName].map(filename => {
        return new Promise((resolve, reject) => {
          let buffer = readChunk.sync(`./${filename}`, 0, fs.statSync(`./${filename}`)["size"])
          let param2 = {
            Bucket: "fashiondogam-images",
            Key: decodeURIComponent(`${folderName}/${filename}`),
            ACL: "public-read",
            Body: fs.createReadStream(`./${filename}`),
            ContentType: imageType(buffer)["mime"]
          }
          S3.upload(param2, function(err: Error, data: AWS.S3.ManagedUpload.SendData) {
            if (err) {
              logWithDate(err)
              reject(err)
            }
            resolve()
          })
        })
      })
    )

    //Delete S3 original image
    await DeleteImage(decodeURIComponent(`${folderName}_temp/${imageUrl}`))

    //Delete file from local
    await Promise.all(
      [imageUrl, xsmallName, smallName, mediumName, largeName].map(filename => {
        return new Promise((resolve, reject) => {
          fs.unlink(filename, function(err) {
            if (err) reject(err)
            resolve()
          })
        })
      })
    )

    logWithDate(`Deployed 3 Images`)
    return `https://fashiondogam-images.s3.ap-northeast-2.amazonaws.com/${folderName}/` + imageUrl
  } catch (e) {
    logWithDate("[Error] Failed to deploy Image")
    logWithDate(e)
    return null
  }
}

export async function DeployImage(imageUrl: string): Promise<string> {
  let folderName = "image"
  if (process.env.MODE != "DEPLOY") folderName = "testimage"

  imageUrl = imageUrl.replace(`https://fashiondogam-images.s3.ap-northeast-2.amazonaws.com/${folderName}_temp/`, "")

  var param = {
    Bucket: "fashiondogam-images",
    ACL: "public-read",
    CopySource: "fashiondogam-images/" + `${folderName}_temp/` + imageUrl,
    Key: `${folderName}/` + imageUrl
  }
  try {
    await new Promise((resolve, reject) => {
      S3.copyObject(param)
        .promise()
        .then(() => {
          S3.deleteObject({
            Bucket: "fashiondogam-images",
            Key: `${folderName}_temp/` + imageUrl
          })
            .promise()
            .then(() => {
              logWithDate("Successfully Deployed Image")
              resolve()
            })
            .catch(e => {
              logWithDate("[Error] Failed to deploy Image")
              logWithDate(e)
              reject(e)
            })
        })
        .catch(e => {
          logWithDate("[Error] Failed to deploy Image")
          logWithDate(e)
          reject(e)
        })
    })

    return `https://fashiondogam-images.s3.ap-northeast-2.amazonaws.com/${folderName}/` + imageUrl
  } catch (e) {
    logWithDate("Failed to deploy Image")
    logWithDate(e)
    return null
  }
}

export async function UploadImageTemp(itemImg: any): Promise<string> {
  const { createReadStream, filename, mimetype, encoding } = await itemImg

  let date = getFormatDate(new Date())
  let hour = getFormatHour(new Date())

  let folderName = "image_temp/"
  if (process.env.MODE != "DEPLOY") folderName = "testimage_temp/"

  var param = {
    Bucket: "fashiondogam-images",
    Key: folderName + date + hour + filename,
    ACL: "public-read",
    Body: createReadStream(),
    ContentType: mimetype
  }

  try {
    let imageUrl: string = await new Promise((resolve, reject) => {
      S3.upload(param, function(err: Error, data: AWS.S3.ManagedUpload.SendData) {
        if (err) {
          logWithDate(err)
          reject(err)
        }
        let imageUrl = data.Location
        resolve(imageUrl)
      })
    })
    logWithDate("image Upload Temporary")
    return imageUrl
  } catch (e) {
    logWithDate("Failed to Upload Image")
    logWithDate(e)
    return null
  }
}

export function ExtractFieldFromList(list: any, fieldName: string, depth: number = 1): any {
  let result = []
  list.forEach(item => {
    if (depth != 1) {
      let tempArray = ExtractFieldFromList(item, fieldName, depth - 1)
      result = result.concat(tempArray)
    } else result.push(item[fieldName])
  })
  return result
}

export async function DeleteImage(imageUrl: string) {
  return new Promise((resolve, reject) => {
    S3.deleteObject({
      Bucket: "fashiondogam-images",
      Key: imageUrl
    })
      .promise()
      .then(() => {
        console.log(imageUrl)
        logWithDate("Successfully Deleted Image")
        resolve()
      })
      .catch(e => {
        logWithDate("[Error] Failed to delete Image")
        logWithDate(e)
        reject(e)
      })
  })
}

export async function Make4VersionsOfImage(
  imageUrl: string,
  dimensions: any,
  xsmallName: string,
  smallName: string,
  mediumName: string,
  largeName: string
) {
  await sharp(`./${imageUrl}`)
    .resize({ width: 128 })
    .toFile(`./${xsmallName}`)

  await sharp(`./${imageUrl}`)
    .resize({ width: 256 })
    .toFile(`./${smallName}`)

  if (dimensions.width < 512) {
    await new Promise((resolve, reject) => {
      let outStream = fs.createWriteStream(`./${mediumName}`)
      fs.createReadStream(`./${imageUrl}`).pipe(outStream)
      outStream.on("end", () => {
        resolve("end")
      })
      outStream.on("finish", () => {
        resolve("finish")
      })
    })
  } else {
    await sharp(`./${imageUrl}`)
      .resize({ width: 512 })
      .toFile(`./${mediumName}`)
  }

  if (dimensions.width < 1024) {
    await new Promise((resolve, reject) => {
      let outStream = fs.createWriteStream(`./${largeName}`)
      fs.createReadStream(`./${imageUrl}`).pipe(outStream)
      outStream.on("end", () => {
        resolve("end")
      })
      outStream.on("finish", () => {
        resolve("finish")
      })
    })
  } else {
    await sharp(`./${imageUrl}`)
      .resize({ width: 1024 })
      .toFile(`./${largeName}`)
  }
}

/*
async function SequentialPromise<T>(arr: Promise<{}>[]): Promise<Array<T>> {
  let resultArr = new Array<any>(arr.length)
  await Promise.all(
    arr.map((item: Promise<{}>, index: number) => {
      return new Promise((resolve, reject) => {
        item.then((result: any) => {
          resultArr[index] = result
          resolve()
        })
      })
    })
  )
  return resultArr
}
*/
