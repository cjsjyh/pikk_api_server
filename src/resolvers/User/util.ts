const { pool } = require("../../database/connectionPool")
import * as ReturnType from "./type/ReturnType"
import { RunSingleSQL } from "../Util/util"

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
