import { RunSingleSQL } from "../Utils/promiseUtil"
import * as ReturnType from "./type/ReturnType"
import { ValidateUser } from "../Utils/securityUtil"
import { NotificationSetInfoInput } from "./type/ArgType"
import { logWithDate } from "../Utils/stringUtil"

module.exports = {
  Query: {
    getUserNotification: async (parent: void, arg: any, ctx: any): Promise<ReturnType.NotificationInfo[]> => {
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)

      let result = await RunSingleSQL(`SELECT * FROM "NOTIFICATION" WHERE "FK_accountId"=${arg.accountId} ORDER BY time DESC`)

      return result
    }
  },

  Mutation: {
    setUserNotification: async (parent: void, args: any, ctx: any): Promise<boolean> => {
      let arg: NotificationSetInfoInput = args.notificationSetInfoInput
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)

      try {
        await RunSingleSQL(`UPDATE "NOTIFICATION" SET "isViewed" = true WHERE id=${arg.notificationId}`)
        return true
      } catch (e) {
        logWithDate("[Error] Failed to Set User Notification")
        logWithDate(e)
        return false
      }
    }
  }
}
