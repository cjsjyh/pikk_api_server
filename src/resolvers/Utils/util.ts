const { pool } = require("../../database/connectionPool")
const { S3 } = require("../../database/aws_s3")

import * as AWS from "aws-sdk"

export async function SequentialPromiseValue<T, U>(arr: T[], func: Function, args: Array<U> = []): Promise<Array<any>> {
  let resultArr = new Array<T>(arr.length)
  await Promise.all(
    arr.map((item: any, index: number) => {
      return new Promise((resolve, reject) => {
        func(item, args)
          .then((result: any) => {
            resultArr[index] = result
            resolve()
          })
          .catch((e: Error) => reject(e))
      })
    })
  )
  return resultArr
}

export function getFormatDate(date) {
  var year = date.getFullYear() //yyyy
  var month = 1 + date.getMonth() //M
  month = month >= 10 ? month : "0" + month //month 두자리로 저장
  var day = date.getDate() //d
  day = day >= 10 ? day : "0" + day //day 두자리로 저장
  return year + "" + month + "" + day
}

export function getFormatHour(secs) {
  secs = Math.round(secs)
  var hours = Math.floor(secs / (60 * 60))

  var divisor_for_minutes = secs % (60 * 60)
  var minutes = Math.floor(divisor_for_minutes / 60)

  var divisor_for_seconds = divisor_for_minutes % 60
  var seconds = Math.ceil(divisor_for_seconds)

  return hours + "" + minutes + "" + seconds
}

export function RunSingleSQL(sql: string, args?: any): Promise<any> {
  return new Promise(async (resolve, reject) => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    try {
      let queryResult
      if (args == null) queryResult = await client.query(sql)
      else queryResult = await client.query(sql, args)

      client.release()
      resolve(queryResult.rows)
    } catch (e) {
      client.release()
      console.log(e)
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

export async function UploadImage(itemImg: any): Promise<string> {
  const { createReadStream, filename, mimetype, encoding } = await itemImg

  let date = getFormatDate(new Date())
  let hour = getFormatHour(new Date())

  var param = {
    Bucket: "fashiondogam-images",
    Key: "image/" + date + hour + filename,
    ACL: "public-read",
    Body: createReadStream(),
    ContentType: mimetype
  }

  try {
    let imageUrl: string = await new Promise((resolve, reject) => {
      S3.upload(param, function(err: Error, data: AWS.S3.ManagedUpload.SendData) {
        if (err) {
          console.log(err)
          reject(err)
        }
        console.log(data)
        let imageUrl = data.Location
        resolve(imageUrl)
      })
    })
    return imageUrl
  } catch (e) {
    return null
  }
}

export function GetFormatSql(filter: any): string {
  let filterSql = ""
  if (Object.prototype.hasOwnProperty.call(filter, "filterGeneral")) {
    filterSql += `ORDER BY "${filter.filterGeneral.sortBy}" ${filter.filterGeneral.sort} NULLS LAST`
    if (filter.filterGeneral.first > 50) filter.filterGeneral.first = 50
    filterSql += " LIMIT " + filter.filterGeneral.first + " OFFSET " + filter.filterGeneral.start
  } else {
    filterSql += " LIMIT 50 OFFSET 0"
  }

  return filterSql
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
