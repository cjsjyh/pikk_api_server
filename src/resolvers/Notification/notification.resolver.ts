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
        let result = await RunSingleSQL(`
          SELECT 
            noti."id",
            noti."postId",
            noti."postType",
            noti."postTitle",
            noti."content",
            noti."FK_accountId" as "accountId",
            noti."time",
            noti."isViewed",
            noti."notificationType",
            user_info."name" as "sentUserName",
            user_info."profileImgUrl" as "sentUserImageUrl"
          FROM "NOTIFICATION" noti 
          INNER JOIN "USER_INFO" user_info
          ON noti."FK_sentUserId" = user_info."FK_accountId"
          WHERE noti."FK_accountId"=${arg.accountId} 
          ORDER BY time DESC
        `)
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
        logger.warn(`Failed to Set User ${arg.accountId} Notification ${arg.notificationId}`)
        logger.error(e.stack)
        throw new Error("Failed to Set User Notification")
      }
    },

    deleteUserNotification: async (parent: void, args: any, ctx: any): Promise<boolean> => {
      let arg: NotificationSetInfoInput = args.notificationSetInfoInput
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)

      try {
        await RunSingleSQL(`DELETE FROM "NOTIFICATION" WHERE id=${arg.notificationId}`)
        logger.info(`Deleted User Notification id: ${arg.notificationId}`)
        return true
      } catch (e) {
        logger.warn(`Failed to Delete User ${arg.accountId} Notification ${arg.notificationId}`)
        logger.error(e.stack)
        throw new Error("Failed to Delete User Notification")
      }
    }
  }
}
