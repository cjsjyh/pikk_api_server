import { RunSingleSQL, SequentialPromiseValue, UploadImageWrapper } from "../Utils/promiseUtil"
import * as ReturnType from "./type/ReturnType"
import { MutationArgInfo } from "./type/ArgType"
import { ValidateUser } from "../Utils/securityUtil"
import { DelCacheByPattern } from "../../database/redisConnect"
import { InsertIntoNotificationQueue } from "../Notification/util"
var logger = require("../../tools/logger")

module.exports = {
  Query: {
    isFollowingTarget: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ReturnType.FollowInfo = args.followInfo
      try {
        if (!ValidateUser(ctx, arg.accountId)) throw new Error("[Error] User not authorized!")

        let tableName
        let variableName
        if (arg.targetType == "ITEM") {
          tableName = "ITEM"
          variableName = "itemId"
        } else if (arg.targetType == "RECOMMEND") {
          tableName = "RECOMMEND_POST"
          variableName = "postId"
        } else if (arg.targetType == "CHANNEL") {
          tableName = "CHANNEL"
          variableName = "channelId"
        } else if (arg.targetType == "COMMUNITY") {
          tableName = "COMMUNITY_POST"
          variableName = "postId"
        }

        let query = `SELECT "FK_accountId" FROM "${tableName}_FOLLOWER" WHERE "FK_accountId"=${arg.accountId} and "FK_${variableName}"=${arg.targetId}`
        let result = await RunSingleSQL(query)
        logger.info(`IsFollowingTarget Called!`)
        if (result.length == 0) return false
        else return true
      } catch (e) {
        logger.warn("Failed to check following status")
        logger.error(e.stack)
        throw new Error("[Error] Failed to check following status")
      }
    }
  },

  Mutation: {
    UploadImages: async (parent: void, args: any, ctx: any): Promise<string[]> => {
      try {
        let imageUrls: string[] = await SequentialPromiseValue(args.images, UploadImageWrapper)
        return imageUrls
      } catch (e) {
        logger.warn("Failed to Upload Image")
        logger.error(e.stack)
        throw new Error("[Error] Failed to Upload Image")
      }
    },

    FollowTarget: async (parent: void, args: MutationArgInfo, ctx: any): Promise<number> => {
      let arg: ReturnType.FollowInfo = args.followInfo
      try {
        if (!ValidateUser(ctx, arg.accountId)) throw new Error("[Error] User not authorized!")

        if (arg.targetType == "RECOMMEND") {
          await DelCacheByPattern("allRecom01DESCtime" + String(arg.targetId) + "*")
        }

        let query = `SELECT toggle${arg.targetType}Follow(${arg.accountId},${arg.targetId})`
        let result = await RunSingleSQL(query)
        result = Object.values(result[0])

        //If target was followed (not cancelled)
        if ((arg.targetType == "RECOMMEND" || arg.targetType == "COMMUNITY") && result[0] == 1)
          InsertIntoNotificationQueue("NEW_PICKK_TO_MY_POST", arg.targetId, arg.targetType, "", "", -1, arg.accountId)
        else if (arg.targetType == "CHANNEL" && result[0] == 1)
          InsertIntoNotificationQueue("NEW_PICKK_TO_MY_CHANNEL", arg.targetId, arg.targetType, "", "", -1, arg.accountId)

        logger.info(`Followed User${arg.accountId} Followed ${arg.targetType} id: ${arg.targetId}`)
        return result[0]
      } catch (e) {
        logger.warn("Failed to Insert into FOLLOWER")
        logger.error(e.stack)
        throw new Error("[Error] Failed to Insert into FOLLOWER")
      }
    },

    IncreaseViewCount: async (parent: void, args: any): Promise<Boolean> => {
      try {
        let query = `UPDATE "${args.postType}_POST" SET "viewCount" = "viewCount" + 1 WHERE id = ${args.postId}`
        let result = await RunSingleSQL(query)
        logger.info(`RecommendPost viewCount Increased`)
        return true
      } catch (e) {
        logger.warn(`Failed to increase view count for ${args.postType} ${args.postId}`)
        logger.error(e.stack)
        throw new Error(`Failed to increase view count for ${args.postType} ${args.postId}`)
      }
    }
  }
}
