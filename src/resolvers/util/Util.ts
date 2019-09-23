import { SelectionNode } from "graphql"

const { pool } = require("../../database/connectionPool")

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

export function RunSingleSQL(sql: string): Promise<any> {
  return new Promise(async (resolve, reject) => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    try {
      let queryResult = await client.query(sql)
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

export function SearchSelectionSet(selectionset: readonly SelectionNode[]): any {
  let result: string[] = []
  selectionset.forEach((element: any) => {
    result.push(element.name.value)
    if (element.selectionSet !== undefined) {
      result.push(SearchSelectionSet(element.selectionSet.selections))
    }
  })
  return result
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
