const { pool } = require("../../database/connectionPool")
const _ = require("lodash")

import * as ArgType from "./type/ArgType"
import * as PostReturnType from "./type/ReturnType"
import { GetCommunityPostImage } from "./util"
import { QueryArgInfo } from "./type/ArgType"
import { MutationArgInfo } from "./type/ArgType"
import { GetPostFilterSql } from "./util"
import { SequentialPromiseValue, GetMetaData, RunSingleSQL, ExtractSelectionSet } from "../Utils/promiseUtil"
import { GetFormatSql, ConvertListToOrderedPair, ConvertListToString, InsertImageIntoDeleteQueue } from "../Utils/stringUtil"

import { GraphQLResolveInfo } from "graphql"
import { InsertImageIntoTable, EditImageUrlInTable } from "../Common/util"
import { ValidateUser, CheckWriter } from "../Utils/securityUtil"
var logger = require("../../tools/logger")

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
        logger.info(`AllCommunityPosts Called!`)
        return postResult
      } catch (e) {
        logger.warn("Failed to fetch community post from DB")
        logger.error(e)
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
        logger.info(`Community Post has been created by User ${arg.accountId}`)
        return true
      } catch (e) {
        logger.warn("Failed to Insert into COMMUNITY_POST")
        logger.error(e)
        throw new Error(`Failed to Insert into COMMUNITY_POST`)
      }
    },

    editCommunityPost: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.CommunityPostEditInfoInput = args.communityPostEditInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)
      if (!(await CheckWriter("COMMUNITY_POST", arg.postId, arg.accountId)))
        throw new Error(`[Error] User ${arg.accountId} is not the writer of CommunityPost ${arg.postId}`)

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
        logger.info(`EditCommunityPost Done PostId:${arg.postId} userId:${arg.accountId}`)
        return true
      } catch (e) {
        logger.warn("Failed to edit Community Post")
        logger.error(e)
        throw new Error(`Failed to edit Community Post`)
      }
    },

    deleteCommunityPost: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.CommunityPostDeleteInfoInput = args.communityPostDeleteInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)
      if (!(await CheckWriter("COMMUNITY_POST", arg.postId, arg.accountId)))
        throw new Error(`[Error] User ${arg.accountId} is not the writer of CommunityPost ${arg.postId}`)

      try {
        let deleteSql = ""
        deleteSql = InsertImageIntoDeleteQueue("COMMUNITY_POST_IMAGE", "imageUrl", "FK_postId", [arg.postId])

        let querySql = `${deleteSql} DELETE FROM "COMMUNITY_POST" WHERE id=${arg.postId}`
        let result = await RunSingleSQL(querySql)
        logger.info(`Deleted CommunityPost id ${arg.accountId}`)
        return true
      } catch (e) {
        logger.warn(`Delete CommunityPost id: ${arg.postId} Failed!`)
        logger.error(e)
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
    logger.warn(`Failed to make SQL for CommunityPost SelectionField`)
    logger.error(e)
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
