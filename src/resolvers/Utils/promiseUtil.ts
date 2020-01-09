let { pool, resetPool } = require("../../database/connectionPool")
const { S3 } = require("../../database/aws_s3")
const fs = require("fs")
var sizeOf = require("image-size")
const sharp = require("sharp")
const imageType = require("image-type")
const readChunk = require("read-chunk")
var axios = require("axios")

import * as AWS from "aws-sdk"
import { ConvertListToString, ExtractFieldFromObject, getFormatDate, getFormatHour, IsNewImage, removeAllButLast, replaceLastOccurence } from "./stringUtil"
var logger = require("../../tools/logger")

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

export function promiseTimeout(ms, promise) {
  // Create a promise that rejects in <ms> milliseconds
  let timeout = new Promise((resolve, reject) => {
    setTimeout(() => {
      reject("Timed out in " + ms + "ms.")
    }, ms)
  })

  // Returns a race between our timeout and the passed in promise
  return Promise.race([promise, timeout])
}

export async function GetSubField(
  parentList: any,
  tableName: string,
  filterBy: string,
  assignTo: string,
  depth: number = 1,
  customSql: string = "",
  formatSql: string = ""
): Promise<any[]> {
  let parentIdList = ExtractFieldFromList(parentList, "id", depth)
  if (parentIdList.length == 0) return []

  let querySql = `
  SELECT 
    subfield.* 
  FROM "${tableName}" AS subfield 
  WHERE subfield."${filterBy}" IN (${ConvertListToString(parentIdList)}) ${formatSql}`

  let queryResult
  if (customSql == "") queryResult = await RunSingleSQL(querySql)
  else queryResult = await RunSingleSQL(customSql)

  if (queryResult.length == 0) {
    return queryResult
  }

  //Grouping Reviews
  let groupedSubfield = MakeGroups(queryResult, filterBy, parentIdList)
  //Add Review Group to Post
  AssignGroupsToParent(parentList, groupedSubfield, filterBy, assignTo, depth)

  return groupedSubfield
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
        logger.warn("Failed to Connect to DB")
        logger.error(e.stack)
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
      logger.error(e.stack)
      reject("Failed")
    }
  })
}

export async function GetMetaData(tableName: string, column: string = "", value: string = ""): Promise<number> {
  let filterSql = ""
  if (column != "") filterSql = `WHERE "${column}" = ${value}`
  let rows = await RunSingleSQL(`SELECT COUNT(*) FROM "${tableName}" ${filterSql}`)
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

export async function UploadImageWrapper(imageObj: any): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      let url = await UploadImageTemp(imageObj)
      resolve(url)
    } catch (e) {
      reject(0)
    }
  })
}

export async function downloadImage(url, image_path) {
  return new Promise((resolve, reject) => {
    axios({
      url: encodeURI(url),
      responseType: "stream"
    })
      .then(response => {
        response.data
          .pipe(fs.createWriteStream(`./${image_path}`))
          .on("finish", () => resolve())
          .on("error", e => reject(e))
      })
      .catch(err => {
        logger.warn("Failed to download image with Axios")
        logger.error(err.stack)
        reject(err.stack)
      })
  })
}

export async function DeployImageBy4Versions(imageUrl: string): Promise<string> {
  let isSelfHosted = false
  let isAlreadyHosted = false
  let folderName = "image"
  if (process.env.MODE != "DEPLOY") folderName = "testimage"

  try {
    //Invalid Url
    if (!imageUrl) {
      logger.warn("'null' inserted as imageUrl")
      throw new Error("No Image to Deploy!")
    }
    //If Image has been already uploaded
    else if (!IsNewImage(imageUrl)) {
      return imageUrl
    }
    //Is Image Self Hosted?
    else if (imageUrl.includes("https://fashiondogam-images")) {
      isSelfHosted = true
      //Download Image From S3
      imageUrl = imageUrl.replace(`https://fashiondogam-images.s3.ap-northeast-2.amazonaws.com/${folderName}_temp/`, "")
      await new Promise(async (resolve, reject) => {
        try {
          let param = {
            Bucket: "fashiondogam-images",
            Key: decodeURIComponent(`${folderName}_temp/${imageUrl}`)
          }
          S3.getObject(param, async (e, data) => {
            //Failed to Get Object
            if (e) {
              //Check if object has been already uplaoded
              try {
                await S3.headObject({
                  Bucket: "fashiondogam-images",
                  Key: decodeURIComponent(`${folderName}/${imageUrl}`)
                }).promise()
                isAlreadyHosted = true
                resolve()
              } catch (e) {
                logger.error("Failed to Get Image")
                logger.error(e)
                reject(e)
              }
            }
            //Found Object
            else {
              //Save to local
              fs.writeFile(`./${imageUrl}`, data.Body, function(e) {
                if (e) {
                  logger.error(e.stack)
                  logger.error("Failed to save to local")
                  reject(e)
                }
                resolve()
              })
            }
          })
        } catch (e) {
          //If error Occured, Check if it has been already deployed
          try {
            await S3.headObject({
              Bucket: "fashiondogam-images",
              Key: decodeURIComponent(`${folderName}/${imageUrl}`)
            }).promise()
            isAlreadyHosted = true
            resolve()
          } catch (e) {
            logger.error("[Unknown Error] Failed to Get Image")
            reject(e)
          }
          reject(e)
        }
      })
    } else {
      //Need to download Image from other websites
      let newImageName
      newImageName = removeAllButLast(imageUrl, ".")
      newImageName = newImageName.split(".").pop()
      newImageName = newImageName.split("?")[0]
      let date = getFormatDate(new Date())
      let hour = getFormatHour(new Date())
      newImageName = date + hour + String(Math.floor(Math.random() * 10000) + 1) + "." + newImageName

      //If image url doesn't start with http://
      if (imageUrl[0] != "h") {
        let i = 0
        while (imageUrl[i] == "/") i += 1
        imageUrl = imageUrl.substr(i, imageUrl.length)
        imageUrl = "http://" + imageUrl
      }

      await downloadImage(imageUrl, newImageName)
      imageUrl = newImageName
    }

    if (!isAlreadyHosted) {
      try {
        //Make 4 Images
        var dimensions = sizeOf(`./${imageUrl}`)

        var xsmallName = replaceLastOccurence(imageUrl, ".", "_xsmall.")
        var smallName = replaceLastOccurence(imageUrl, ".", "_small.")
        var mediumName = replaceLastOccurence(imageUrl, ".", "_medium.")
        var largeName = imageUrl

        await Make4VersionsOfImage(imageUrl, dimensions, xsmallName, smallName, mediumName, largeName)
      } catch (e) {
        logger.warn("Failed to Make 4 Images")
        logger.error(e.stack)
      }

      //Upload Images
      try {
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
              S3.upload(param2, function(e: Error, data: AWS.S3.ManagedUpload.SendData) {
                if (e) {
                  logger.error(e.stack)
                  reject(e)
                }
                resolve()
              })
            })
          })
        )
      } catch (e) {
        logger.warn("Failed to Upload Images")
        logger.error(e.stack)
      }

      //Delete S3 original image
      try {
        if (isSelfHosted) await DeleteImage(decodeURIComponent(`${folderName}_temp/${imageUrl}`))
      } catch (e) {
        logger.warn("Failed to delete self-Hosted Image")
      }

      try {
        //Delete file from local
        await Promise.all(
          [xsmallName, smallName, mediumName, largeName].map(filename => {
            return new Promise((resolve, reject) => {
              fs.unlink(filename, function(e) {
                if (e) reject(e)
                resolve()
              })
            })
          })
        )
      } catch (e) {
        logger.warn("Failed to Delete Local files")
        logger.error(e)
      }
      logger.info(`Successfully deployed Images`)
    } else {
      logger.info("Image was already Deployed!")
    }

    return `https://fashiondogam-images.s3.ap-northeast-2.amazonaws.com/${folderName}/` + imageUrl
  } catch (e) {
    logger.warn("[Unknown Error] Failed to deploy Image")
    logger.error(e.stack)
    throw new Error("Failed to deploy Image")
  }
}

// export async function DeployImage(imageUrl: string): Promise<string> {
//   let folderName = "image"
//   if (process.env.MODE != "DEPLOY") folderName = "testimage"

//   imageUrl = imageUrl.replace(`https://fashiondogam-images.s3.ap-northeast-2.amazonaws.com/${folderName}_temp/`, "")

//   var param = {
//     Bucket: "fashiondogam-images",
//     ACL: "public-read",
//     CopySource: "fashiondogam-images/" + `${folderName}_temp/` + imageUrl,
//     Key: `${folderName}/` + imageUrl
//   }
//   try {
//     await new Promise((resolve, reject) => {
//       S3.copyObject(param)
//         .promise()
//         .then(() => {
//           S3.deleteObject({
//             Bucket: "fashiondogam-images",
//             Key: `${folderName}_temp/` + imageUrl
//           })
//             .promise()
//             .then(() => {
//               logger.info("Successfully Deployed Image")
//               resolve()
//             })
//             .catch(e => {
//               logger.warn("Failed to delete Image")
//               logger.error(e.stack)
//               reject(e)
//             })
//         })
//         .catch(e => {
//           logger.warn("Failed to copy Image")
//           logger.error(e.stack)
//           reject(e)
//         })
//     })

//     return `https://fashiondogam-images.s3.ap-northeast-2.amazonaws.com/${folderName}/` + imageUrl
//   } catch (e) {
//     logger.warn("Failed to deploy Image")
//     logger.error(e.stack)
//     return null
//   }
// }

export async function UploadImageTemp(itemImg: any): Promise<string> {
  const { createReadStream, filename, mimetype, encoding } = await itemImg

  let date = getFormatDate(new Date())
  let hour = getFormatHour(new Date())

  let folderName = "image_temp/"
  if (process.env.MODE != "DEPLOY") folderName = "testimage_temp/"

  let filenameRefined = removeAllButLast(filename, ".")
  filenameRefined = filenameRefined.replace(" ", "")

  var param
  param = {
    Bucket: "fashiondogam-images",
    Key: folderName + date + hour + filenameRefined,
    ACL: "public-read",
    Body: createReadStream(),
    ContentType: mimetype
  }
  try {
    let imageUrl: string = await new Promise((resolve, reject) => {
      S3.upload(param, function(e: Error, data: AWS.S3.ManagedUpload.SendData) {
        if (e) {
          logger.error(e.stack)
          reject(e)
        }
        let imageUrl = data.Location
        resolve(imageUrl)
      })
    })
    logger.info("image Uploaded Temporary")
    return imageUrl
  } catch (e) {
    logger.warn("Failed to Upload Image")
    logger.error(e.stack)
    throw new Error("Failed to Upload Image")
  }
}

export function ExtractFieldFromList(list: any, fieldName: string, depth: number = 1, isTargetInArray: boolean = false): any {
  let result = []

  list.forEach(item => {
    if (depth != 1) {
      let tempArray = ExtractFieldFromList(item, fieldName, depth - 1)
      result = result.concat(tempArray)
    } else {
      //Iterate through properties
      for (let [key, value] of Object.entries(item)) {
        //if not an object and matches field name
        if (key == fieldName) {
          if (isTargetInArray) result = result.concat(value)
          else result.push(value)
        }
        //if object, recursive
        else if (typeof value === "object") {
          let tempArray = ExtractFieldFromObject(value, fieldName, isTargetInArray)
          result = result.concat(tempArray)
        }
      }
    }
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
        resolve()
      })
      .catch(e => {
        logger.warn("Failed to delete Image")
        logger.error(e.stack)
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

  //Full size
  // await new Promise((resolve, reject) => {
  //   let outStream = fs.createWriteStream(`./${largeName}`)
  //   fs.createReadStream(`./${imageUrl}`).pipe(outStream)
  //   outStream.on("end", () => {
  //     resolve("end")
  //   })
  //   outStream.on("finish", () => {
  //     resolve("finish")
  //   })
  // })
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
