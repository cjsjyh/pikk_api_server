const { pool } = require("../../database/connectionPool")
const _ = require("lodash")

import * as ArgType from "./type/ArgType"
import * as PostReturnType from "./type/ReturnType"
import { GetCommunityPostImage } from "./util"
import { QueryArgInfo } from "./type/ArgType"
import { MutationArgInfo } from "./type/ArgType"
import { GetPostFilterSql } from "./util"
import { SequentialPromiseValue, GetMetaData, RunSingleSQL, ExtractSelectionSet } from "../Utils/promiseUtil"
import { GetFormatSql, logWithDate, ConvertListToOrderedPair, ConvertListToString, InsertImageIntoDeleteQueue } from "../Utils/stringUtil"

import { GraphQLResolveInfo } from "graphql"
import { InsertImageIntoTable, EditImageUrlInTable } from "../Common/util"
import { ValidateUser } from "../Utils/securityUtil"

module.exports = {
  Query: {
    allCommunityPosts: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<PostReturnType.CommunityPostInfo[]> => {
      let arg: ArgType.CommunityPostQuery = args.communityPostOption

      try {
        let filterSql: string = ""
        if (Object.prototype.hasOwnProperty.call(arg, "postFilter")) {
          filterSql = await GetPostFilterSql(arg.postFilter)
        }

        let formatSql = GetFormatSql(arg)
        let requestSql = CommunityPostSelectionField(info)
        let querySql = `
        WITH post as (SELECT * FROM "COMMUNITY_POST" ${filterSql} ${formatSql})
        SELECT 
          user_info."name",
          user_info."profileImgUrl",
          post.*
          ${requestSql}
        FROM post
        INNER JOIN "USER_INFO" user_info ON post."FK_accountId" = user_info."FK_accountId"
        `
        let postResult: PostReturnType.CommunityPostInfo[] = await RunSingleSQL(querySql)
        let imgResult = await SequentialPromiseValue(postResult, GetCommunityPostImage)

        postResult.forEach((post: PostReturnType.CommunityPostInfo, index: number) => {
          post.accountId = post.FK_accountId
          post.channelId = post.FK_channelId
          post.imageUrls = []
          imgResult[index].forEach(image => {
            post.imageUrls.push(image.imageUrl)
          })
        })
        return postResult
      } catch (e) {
        logWithDate("[Error] Failed to fetch community post from DB")
        logWithDate(e)
        throw new Error("[Error] Failed to fetch community post from DB")
      }
    },

    _allCommunityPostsMetadata: async (parent: void, args: QueryArgInfo): Promise<number> => {
      return GetMetaData("COMMUNITY_POST")
    }
  },
  Mutation: {
    createCommunityPost: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.CommunityPostInfoInput = args.communityPostInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)

      try {
        if (arg.qnaType === undefined) arg.qnaType = "NONE"
        let postId = await RunSingleSQL(
          `INSERT INTO "COMMUNITY_POST"("FK_accountId","FK_channelId","title","content","postType","qnaType") 
          VALUES (${arg.accountId}, ${arg.channelId}, '${arg.title}', '${arg.content}', '${arg.postType}', '${arg.qnaType}') RETURNING id`
        )
        if (Object.prototype.hasOwnProperty.call(arg, "imageUrls")) {
          let imgPairs = ConvertListToOrderedPair(arg.imageUrls, `,${String(postId[0].id)}`, false)
          await InsertImageIntoTable(imgPairs, "COMMUNITY_POST_IMAGE", "FK_postId")
        }
        logWithDate(`Community Post has been created by User ${arg.accountId}`)
        return true
      } catch (e) {
        logWithDate("[Error] Failed to Insert into COMMUNITY_POST")
        logWithDate(e)
        return false
      }
    },

    editCommunityPost: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.CommunityPostEditInfoInput = args.communityPostEditInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)
      try {
        let querySql = GetCommunityPostEditSql(arg)
        await RunSingleSQL(`UPDATE "COMMUNITY_POST" SET
        ${querySql}
        WHERE "id"=${arg.postId}
        `)

        if (Object.prototype.hasOwnProperty.call(arg, "deletedImages")) {
          if (arg.deletedImages.length != 0) {
            let deleteSql = ""
            deleteSql = InsertImageIntoDeleteQueue("COMMUNITY_POST_IMAGE", "imageUrl", "id", arg.deletedImages)

            let idList = ConvertListToString(arg.deletedImages)
            await RunSingleSQL(`
            ${deleteSql}
            DELETE FROM "COMMUNITY_POST_IMAGE" WHERE id IN (${idList})
          `)
          }
        }

        if (Object.prototype.hasOwnProperty.call(arg, "imageUrls")) {
          await Promise.all(
            arg.imageUrls.map((image, index) => {
              return EditImageUrlInTable(image, "COMMUNITY_POST_IMAGE", "FK_postId", arg.postId, index)
            })
          )
        }
        logWithDate(`EditCommunityPost Done PostId:${arg.postId} userId:${arg.accountId}`)
        return true
      } catch (e) {
        logWithDate("[Error] Failed to edit Community Post")
        logWithDate(e)
        return false
      }
    },

    deleteCommunityPost: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.CommunityPostDeleteInfoInput = args.communityPostDeleteInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)
      try {
        let deleteSql = ""
        deleteSql = InsertImageIntoDeleteQueue("COMMUNITY_POST_IMAGE", "imageUrl", "FK_postId", [arg.postId])

        let querySql = `${deleteSql} DELETE FROM "COMMUNITY_POST" WHERE id=${arg.postId}`
        let result = await RunSingleSQL(querySql)
        return true
      } catch (e) {
        logWithDate(`[Error] Delete CommunityPost id: ${arg.postId} Failed!`)
        logWithDate(e)
        throw new Error(`[Error] Delete CommunityPost id: ${arg.postId} Failed!`)
      }
    }
  }
}

function CommunityPostSelectionField(info: GraphQLResolveInfo) {
  let result = ""
  try {
    let selectionSet: string[] = ExtractSelectionSet(info.fieldNodes[0])
    if (selectionSet.includes("commentCount")) {
      result += `
      ,
      COALESCE((
        SELECT COUNT(*) as "commentCount" 
        FROM "COMMUNITY_POST_COMMENT" comment WHERE comment."FK_postId"=post.id
      ),0)
      `
    }

    return result
  } catch (e) {
    logWithDate(e)
  }
}

function GetCommunityPostEditSql(arg: ArgType.CommunityPostEditInfoInput): string {
  let isMultiple = false
  let resultSql = ""

  if (Object.prototype.hasOwnProperty.call(arg, "title")) {
    if (isMultiple) resultSql += ", "
    resultSql += `"title"='${arg.title}'`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(arg, "content")) {
    if (isMultiple) resultSql += ", "
    resultSql += `"content"='${arg.content}'`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(arg, "postType")) {
    if (isMultiple) resultSql += ", "
    resultSql += `"postType"='${arg.postType}'`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(arg, "qnaType")) {
    if (isMultiple) resultSql += ", "
    resultSql += `"qnaType"='${arg.qnaType}'`
    isMultiple = true
  }

  return resultSql
}
