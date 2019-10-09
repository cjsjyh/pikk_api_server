const { pool } = require("../../database/connectionPool")
import * as ArgType from "./type/ArgType"
import { QueryArgInfo } from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { MutationArgInfo } from "./type/ArgType"
import { RunSingleSQL } from "../Util/util"
import { ConvertToTableName, GetBoardName } from "./util"

module.exports = {
  Query: {
    getComments: async (parent: void, args: QueryArgInfo): Promise<ReturnType.CommentInfo[]> => {
      let arg: ArgType.CommentQuery = args.commentOption

      try {
        let boardName = GetBoardName(arg.boardType)
        let queryResult = await RunSingleSQL(`SELECT * FROM "${boardName}_COMMENT" where "FK_postId"=${arg.postId}`)
        let commentResults: ReturnType.CommentInfo[] = queryResult
        commentResults.forEach(comment => {
          comment.postId = comment.FK_postId
          comment.accountId = comment.FK_accountId
        })

        return commentResults
      } catch (e) {
        console.log(e)
        throw new Error("[Error] Failed to fetch comments")
      }
    }
  },
  Mutation: {
    createComment: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      if (!ctx.IsVerified) throw new Error("USER NOT LOGGED IN!")
      let arg: ArgType.CommentInfoInput = args.commentInfo

      let querySql =
        `INSERT INTO ` +
        ConvertToTableName(arg.targetType) +
        `("FK_postId","FK_accountId","content") VALUES(${arg.targetId},${arg.accountId},'${arg.content}')`

      try {
        let rows = await RunSingleSQL(querySql)
        console.log(`Comment created by User${arg.accountId} on Post${arg.targetType} id ${arg.targetId}`)
        return true
      } catch (e) {
        console.log("[Error] Failed to create Comment")
        return false
      }
    }
  }
}
