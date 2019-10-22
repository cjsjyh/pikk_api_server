const { pool } = require("../../database/connectionPool")
import * as ArgType from "./type/ArgType"
import { QueryArgInfo } from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { MutationArgInfo } from "./type/ArgType"
import { RunSingleSQL } from "../Utils/promiseUtil"
import { ConvertToTableName, GetBoardName } from "./util"
import { CloudWatchEvents } from "aws-sdk"

module.exports = {
  Query: {
    getComments: async (parent: void, args: QueryArgInfo): Promise<ReturnType.CommentInfo[]> => {
      let arg: ArgType.CommentQuery = args.commentOption

      try {
        let boardName = GetBoardName(arg.boardType)
        let querySql = `SELECT * FROM "${boardName}_COMMENT" where "FK_postId"=${arg.postId}`
        let queryResult = await RunSingleSQL(querySql)
        let commentResults: ReturnType.CommentInfo[] = queryResult
        commentResults.forEach(comment => {
          comment.postId = comment.FK_postId
          comment.accountId = comment.FK_accountId
        })

        return commentResults
      } catch (e) {
        console.log("[Error] Failed to Fetch comments")
        console.log(e)
        throw new Error("[Error] Failed to fetch comments")
      }
    }
  },
  Mutation: {
    createComment: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      if (!ctx.IsVerified) throw new Error("[Error] User not Logged In!")
      let arg: ArgType.CommentInfoInput = args.commentInfo

      try {
        let querySql = `INSERT INTO ${ConvertToTableName(arg.targetType)} ("FK_postId","FK_accountId","content") VALUES(${arg.targetId},${
          arg.accountId
        },'${arg.content}')`
        let rows = await RunSingleSQL(querySql)
        console.log(`Comment created by User${arg.accountId} on Post${arg.targetType} id ${arg.targetId}`)
        return true
      } catch (e) {
        console.log("[Error] Failed to create Comment")
        return false
      }
    },

    deleteComment: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      if (!ctx.IsVerified) throw new Error("[Error] User not Logged In!")
      let arg: ArgType.CommentDeleteInput = args.commentInfo

      try {
        let querySql = `DELETE FROM ${ConvertToTableName(arg.targetType)} WHERE id = ${arg.targetId} and "FK_accountId" = ${ctx.userId} RETURNING id`
        let rows = await RunSingleSQL(querySql)
        if (rows.length == 0) throw new Error(`[Error] Unauthorized User trying to delete Comment`)

        console.log(`Comment on Post${arg.targetType} id ${arg.targetId}`)
        return true
      } catch (e) {
        console.log("[Error] Failed to delete Comment")
        console.log(e)
        return false
      }
    }
  }
}
