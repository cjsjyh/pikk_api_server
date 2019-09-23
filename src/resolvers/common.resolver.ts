import { RunSingleSQL } from "./util/Util"
import * as ReturnType from "./type/ReturnType"
import { MutationArgInfo } from "./type/ArgType"

module.exports = {
  Mutation: {
    FollowTarget: async (parent: void, args: MutationArgInfo, ctx: any): Promise<number> => {
      if (!ctx.IsVerified) throw new Error("USER NOT LOGGED IN!")
      let arg: ReturnType.FollowInfo = args.followInfo

      try {
        let query = `SELECT toggle" + arg.targetType + "Follow(${arg.accountId},${arg.targetId})`
        let result = await RunSingleSQL(query)
        result = Object.values(result.rows[0])
        console.log(`Followed User${arg.accountId} Followed ${arg.targetType} id: ${arg.targetId}`)
        return result[0]
      } catch (e) {
        console.log("[Error] Failed to Insert into FOLLOWER")
        console.log(e)
        throw new Error("[Error] Failed to Insert into FOLLOWER")
      }
    },

    isFollowingTarget: async (parent: void, args: MutationArgInfo): Promise<Boolean> => {
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
        let query = `SELECT "FK_accountId" FROM "${tableName}_FOLLOWER" WHERE "FK_accountId"=${arg.accountId} and "FK_${variableName}"=${arg.targetId}`
        let result = await RunSingleSQL(query)
        if (result.length == 0) return false
        else return true
      } catch (e) {
        console.log("[Error] Failed to check following status")
        console.log(e)
        throw new Error("[Error] Failed to check following status")
      }
    },

    IncrementViewCount: async (parent: void, args: any): Promise<Boolean> => {
      try {
        let query = `UPDATE "${args.postType}_POST" SET "viewCount" = "viewCount" + 1 WHERE id = ${args.postId}`
        let result = await RunSingleSQL(query)
        return true
      } catch (e) {
        console.log(`[Error] Failed to increase view count for ${args.postType} ${args.postId}`)
        console.log(e)
        return false
      }
    }
  }
}
