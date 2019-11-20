import { RunSingleSQL, SequentialPromiseValue, UploadImageWrapper } from "../Utils/promiseUtil"
import * as ReturnType from "./type/ReturnType"
import { MutationArgInfo } from "./type/ArgType"
import { ValidateUser } from "../Utils/securityUtil"
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
        } else if (arg.targetType == "RECOMMENDPOST") {
          tableName = "RECOMMEND_POST"
          variableName = "postId"
        } else if (arg.targetType == "CHANNEL") {
          tableName = "CHANNEL"
          variableName = "channelId"
        }

        let query = `SELECT "FK_accountId" FROM "${tableName}_FOLLOWER" WHERE "FK_accountId"=${arg.accountId} and "FK_${variableName}"=${arg.targetId}`
        let result = await RunSingleSQL(query)
        logger.info(`IsFollowingTarget Called!`)
        if (result.length == 0) return false
        else return true
      } catch (e) {
        logger.warn("Failed to check following status")
        logger.error(e)
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
        logger.error(e)
        throw new Error("[Error] Failed to Upload Image")
      }
    },

    FollowTarget: async (parent: void, args: MutationArgInfo, ctx: any): Promise<number> => {
      if (!ctx.IsVerified) throw new Error("[Error] User not Logged In!")
      let arg: ReturnType.FollowInfo = args.followInfo

      try {
        let query = `SELECT toggle${arg.targetType}Follow(${arg.accountId},${arg.targetId})`
        let result = await RunSingleSQL(query)
        result = Object.values(result[0])
        logger.info(`Followed User${arg.accountId} Followed ${arg.targetType} id: ${arg.targetId}`)
        return result[0]
      } catch (e) {
        logger.warn("Failed to Insert into FOLLOWER")
        logger.error(e)
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
        logger.error(e)
        throw new Error(`Failed to increase view count for ${args.postType} ${args.postId}`)
      }
    }
  }
}
