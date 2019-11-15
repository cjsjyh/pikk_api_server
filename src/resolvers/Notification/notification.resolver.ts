import { RunSingleSQL } from "../Utils/promiseUtil"
import * as ReturnType from "./type/ReturnType"
import { ValidateUser } from "../Utils/securityUtil"

module.exports = {
  Query: {
    getUserNotification: async (parent: void, arg: any, ctx: any): Promise<ReturnType.NotificationInfo[]> => {
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)

      let result = await RunSingleSQL(`SELECT * FROM "NOTIFICATION" WHERE "FK_accountId"=${arg.accountId}`)

      return result
    }
  }
}
