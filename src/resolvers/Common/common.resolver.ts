import { RunSingleSQL } from "../Utils/promiseUtil"
import * as ReturnType from "./type/ReturnType"
import { MutationArgInfo } from "./type/ArgType"
import { ValidateUser } from "../Utils/securityUtil"
import { logWithDate } from "../Utils/stringUtil"

module.exports = {
  Query: {
    isFollowingTarget: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ReturnType.FollowInfo = args.followInfo

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

      try {
        if (!ValidateUser(ctx, arg.accountId)) throw new Error("[Error] User not authorized!")
        let query = `SELECT "FK_accountId" FROM "${tableName}_FOLLOWER" WHERE "FK_accountId"=${arg.accountId} and "FK_${variableName}"=${arg.targetId}`
        let result = await RunSingleSQL(query)
        if (result.length == 0) return false
        else return true
      } catch (e) {
        logWithDate("[Error] Failed to check following status")
        logWithDate(e)
        throw new Error("[Error] Failed to check following status")
      }
    }
  },

  Mutation: {
    FollowTarget: async (parent: void, args: MutationArgInfo, ctx: any): Promise<number> => {
      if (!ctx.IsVerified) throw new Error("[Error] User not Logged In!")
      let arg: ReturnType.FollowInfo = args.followInfo

      try {
        let query = `SELECT toggle${arg.targetType}Follow(${arg.accountId},${arg.targetId})`
        let result = await RunSingleSQL(query)
        result = Object.values(result[0])
        logWithDate(`Followed User${arg.accountId} Followed ${arg.targetType} id: ${arg.targetId}`)
        return result[0]
      } catch (e) {
        logWithDate("[Error] Failed to Insert into FOLLOWER")
        logWithDate(e)
        throw new Error("[Error] Failed to Insert into FOLLOWER")
      }
    },

    IncrementViewCount: async (parent: void, args: any): Promise<Boolean> => {
      try {
        let query = `UPDATE "${args.postType}_POST" SET "viewCount" = "viewCount" + 1 WHERE id = ${args.postId}`
        let result = await RunSingleSQL(query)
        return true
      } catch (e) {
        logWithDate(`[Error] Failed to increase view count for ${args.postType} ${args.postId}`)
        logWithDate(e)
        return false
      }
    }
  }
}
