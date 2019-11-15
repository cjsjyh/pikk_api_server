const { pool } = require("../../database/connectionPool")
import * as ArgType from "./type/ArgType"
import { QueryArgInfo } from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { MutationArgInfo } from "./type/ArgType"
import { RunSingleSQL } from "../Utils/promiseUtil"
import { ConvertToTableName, GetBoardName } from "./util"
import { CloudWatchEvents } from "aws-sdk"
import { ValidateUser } from "../Utils/securityUtil"
import { logWithDate } from "../Utils/stringUtil"

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
          comment.parentId = comment.FK_parentId
        })

        logWithDate(`GetComments Called`)
        return commentResults
      } catch (e) {
        logWithDate("[Error] Failed to Fetch comments")
        logWithDate(e)
        throw new Error("[Error] Failed to fetch comments")
      }
    }
  },
  Mutation: {
    createComment: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.CommentInfoInput = args.commentInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)

      try {
        let querySql = `INSERT INTO ${ConvertToTableName(arg.targetType)} ("FK_postId","FK_accountId","FK_parentId","content") 
        VALUES(
          ${arg.targetId},${arg.accountId},${arg.parentId},'${arg.content}')`
        let rows = await RunSingleSQL(querySql)
        logWithDate(`Comment created by User${arg.accountId} on Post${arg.targetType} id ${arg.targetId}`)
        return true
      } catch (e) {
        logWithDate("[Error] Failed to create Comment")
        return false
      }
    },

    deleteComment: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.CommentDeleteInput = args.commentInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)

      try {
        let querySql = `DELETE FROM ${ConvertToTableName(arg.targetType)} WHERE id = ${arg.targetId}`
        let rows = await RunSingleSQL(querySql)

        logWithDate(`Deleted Comment on Post${arg.targetType} id ${arg.targetId}`)
        return true
      } catch (e) {
        logWithDate("[Error] Failed to delete Comment")
        logWithDate(e)
        return false
      }
    }
  }
}
