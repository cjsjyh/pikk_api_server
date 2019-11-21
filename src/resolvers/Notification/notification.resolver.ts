import { RunSingleSQL } from "../Utils/promiseUtil"
import * as ReturnType from "./type/ReturnType"
import { ValidateUser } from "../Utils/securityUtil"
import { NotificationSetInfoInput } from "./type/ArgType"
var logger = require("../../tools/logger")

module.exports = {
  Query: {
    getUserNotification: async (parent: void, arg: any, ctx: any): Promise<ReturnType.NotificationInfo[]> => {
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)

      try {
        let result = await RunSingleSQL(`SELECT * FROM "NOTIFICATION" WHERE "FK_accountId"=${arg.accountId} ORDER BY time DESC`)
        logger.info(`User notification fetched for userId: ${arg.accountId}`)
        return result
      } catch (e) {
        logger.warn(`Failed to Get User Notification id: ${arg.accountId}`)
        logger.error(e.stack)
        throw new Error(`[Error] Failed to Get User Notification id: ${arg.accountId}`)
      }
    }
  },

  Mutation: {
    setUserNotification: async (parent: void, args: any, ctx: any): Promise<boolean> => {
      let arg: NotificationSetInfoInput = args.notificationSetInfoInput
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)

      try {
        await RunSingleSQL(`UPDATE "NOTIFICATION" SET "isViewed" = true WHERE id=${arg.notificationId}`)
        logger.info(`Set User Notification id: ${arg.notificationId}`)
        return true
      } catch (e) {
        logger.warn("Failed to Set User Notification")
        logger.error(e.stack)
        return false
      }
    }
  }
}
