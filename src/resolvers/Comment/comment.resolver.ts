import * as ArgType from "./type/ArgType"
import { QueryArgInfo } from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { MutationArgInfo } from "./type/ArgType"
import { RunSingleSQL } from "../Utils/promiseUtil"
import { ConvertToCommentTableName, GetBoardName } from "./util"
import { ValidateUser, CheckWriter } from "../Utils/securityUtil"
import { InsertIntoNotificationQueue } from "../Notification/util"
import { DelCacheByPattern } from "../../database/redisConnect"
var logger = require("../../tools/logger")

module.exports = {
  Query: {
    getComments: async (parent: void, args: QueryArgInfo): Promise<ReturnType.CommentInfo[]> => {
      let arg: ArgType.CommentQuery = args.commentOption

      try {
        let boardName = GetBoardName(arg.postType)
        let querySql = `SELECT * FROM "${boardName}_COMMENT" where ${GetCommentQuerySql(arg.commentFilter)}`
        let queryResult = await RunSingleSQL(querySql)
        let commentResults: ReturnType.CommentInfo[] = queryResult
        commentResults.forEach(comment => {
          comment.postId = comment.FK_postId
          comment.accountId = comment.FK_accountId
          comment.parentId = comment.FK_parentId
        })

        logger.info(`GetComments Called`)
        return commentResults
      } catch (e) {
        logger.warn("Failed to Fetch comments")
        logger.error(e.stack)
        throw new Error("[Error] Failed to fetch comments")
      }
    }
  },
  Mutation: {
    createComment: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.CommentInfoInput = args.commentInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)

      try {
        if (arg.targetType == "RECOMMEND") {
          await DelCacheByPattern("allRecom*DESCtimeRECOMMEND0")
          await DelCacheByPattern("allRecom01DESCtime" + String(arg.targetId) + "RECOMMEND0")
        }

        let querySql = `INSERT INTO "${ConvertToCommentTableName(arg.targetType)}" ("FK_postId","FK_accountId","FK_parentId","content") 
        VALUES(
          ${arg.targetId},${arg.accountId},${arg.parentId},'${arg.content}')`
        let rows = await RunSingleSQL(querySql)
        logger.info(`Comment created by User${arg.accountId} on Post${arg.targetType} id ${arg.targetId}`)

        //Commented to a post
        if (arg.parentId == null) {
          InsertIntoNotificationQueue("COMMENT_TO_MY_POST", arg.targetId, arg.targetType, "", arg.content, -1, arg.accountId)
        }
        //Comented to a comment
        else {
          InsertIntoNotificationQueue("COMMENT_TO_MY_COMMENT", arg.targetId, arg.targetType, "", arg.content, arg.parentId, arg.accountId)
        }

        return true
      } catch (e) {
        logger.warn("Failed to create Comment")
        logger.error(e.stack)
        throw new Error(`Failed to create Comment`)
      }
    },

    deleteComment: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.CommentDeleteInput = args.commentInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)
      if (!(await CheckWriter(ConvertToCommentTableName(arg.targetType), arg.targetId, arg.accountId))) {
        logger.warn(`[Error] User ${arg.accountId} is not the writer of ${arg.targetType} Comment ${arg.targetId}`)
        throw new Error(`[Error] User ${arg.accountId} is not the writer of ${arg.targetType} Comment ${arg.targetId}`)
      }
      try {
        if (arg.targetType == "RECOMMEND") {
          await DelCacheByPattern("allRecom*DESCtimeRECOMMEND0")
          await DelCacheByPattern("allRecom01DESCtime" + String(arg.targetId) + "RECOMMEND0")
        }

        let querySql = `DELETE FROM "${ConvertToCommentTableName(arg.targetType)}" WHERE id = ${arg.targetId}`
        let rows = await RunSingleSQL(querySql)

        logger.info(`Deleted Comment on Post${arg.targetType} id ${arg.targetId}`)
        return true
      } catch (e) {
        logger.warn("Failed to delete Comment")
        logger.error(e.stack)
        throw new Error("Failed to delete Comment")
      }
    }
  }
}

function GetCommentQuerySql(arg: ArgType.CommentFilter): string {
  let isMultiple = false
  let resultSql = ""

  if (Object.prototype.hasOwnProperty.call(arg, "postId")) {
    if (isMultiple) resultSql += ", "
    resultSql += `"FK_postId"=${arg.postId}`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(arg, "accountId")) {
    if (isMultiple) resultSql += ", "
    resultSql += `"FK_accountId"=${arg.accountId}`
    isMultiple = true
  }

  return resultSql
}
