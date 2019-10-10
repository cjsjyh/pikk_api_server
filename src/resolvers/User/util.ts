const { pool } = require("../../database/connectionPool")
import * as ReturnType from "./type/ReturnType"
import { RunSingleSQL } from "../Utils/util"

export async function GetUserInfo(postInfo: any): Promise<ReturnType.UserInfo> {
  return new Promise(async (resolve, reject) => {
    try {
      let queryResult = await RunSingleSQL('SELECT * FROM "USER_INFO" where "FK_accountId"=$1', [postInfo.FK_accountId])
      resolve(queryResult[0])
    } catch (e) {
      reject(e)
    }
  })
}

export async function FetchUserForReview(reviewInfo: any): Promise<{}> {
  return new Promise(async (resolve, reject) => {
    try {
      let queryResult = await RunSingleSQL(`
      WITH aaa as (SELECT "FK_accountId" FROM "RECOMMEND_POST" WHERE id = ${reviewInfo.FK_postId})
      SELECT bbb.* FROM "USER_INFO" as bbb
      INNER JOIN aaa on aaa."FK_accountId" = bbb."FK_accountId"`)
      reviewInfo.userInfo = queryResult[0]
      resolve()
    } catch (e) {
      reject(e)
    }
  })
}
