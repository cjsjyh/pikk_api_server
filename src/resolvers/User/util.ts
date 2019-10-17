const { pool } = require("../../database/connectionPool")
import * as ReturnType from "./type/ReturnType"
import { RunSingleSQL } from "../Utils/promiseUtil"
import { ConvertListToString } from "../Utils/stringUtil"

export async function GetUserInfo(userIdList: any, requestSql: string = "", formatSql: string = ""): Promise<ReturnType.UserInfo[]> {
  return new Promise(async (resolve, reject) => {
    try {
      let querySql = `
      WITH user_info as 
      (
        SELECT * FROM "USER_INFO"
        WHERE "USER_INFO"."FK_accountId" IN (${ConvertListToString(userIdList)})
      )
      SELECT 
        user_info.* ${requestSql}
      FROM user_info
      ${formatSql}
      `

      let queryResult = await RunSingleSQL(querySql)
      resolve(queryResult)
    } catch (e) {
      reject(e)
    }
  })
}

export async function FetchUserForReview(reviewInfo: any): Promise<{}> {
  return new Promise(async (resolve, reject) => {
    try {
      let queryResult = await RunSingleSQL(`SELECT "FK_accountId" FROM "RECOMMEND_POST" WHERE id = ${reviewInfo.FK_postId}`)
      queryResult = await GetUserInfo([queryResult[0]])
      reviewInfo.userInfo = queryResult[0]
      resolve()
    } catch (e) {
      reject(e)
    }
  })
}

export async function FetchUserForCommunityPost(postInfo: any): Promise<ReturnType.UserInfo> {
  let queryResult = await GetUserInfo([postInfo.FK_accountId])
  return queryResult[0]
}
