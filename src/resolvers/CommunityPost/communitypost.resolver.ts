const { pool } = require("../../database/connectionPool")
const _ = require("lodash")

import * as ArgType from "./type/ArgType"
import * as PostReturnType from "./type/ReturnType"
import { GetCommunityPostImage } from "./util"
import { QueryArgInfo } from "./type/ArgType"
import { MutationArgInfo } from "./type/ArgType"
import { GetPostFilterSql } from "./util"
import {
  SequentialPromiseValue,
  GetMetaData,
  RunSingleSQL,
  ExtractSelectionSet,
  DeployImageBy4Versions,
  ExtractFieldFromList
} from "../Utils/promiseUtil"
import { GetFormatSql, ConvertListToOrderedPair, ConvertListToString, InsertImageIntoDeleteQueue } from "../Utils/stringUtil"

import { GraphQLResolveInfo } from "graphql"
import { InsertImageIntoTable, EditImageUrlInTable, IncreaseViewCountFunc } from "../Common/util"
import { ValidateUser, CheckWriter } from "../Utils/securityUtil"
var logger = require("../../tools/logger")
var elastic = require("../../database/elasticConnect")

module.exports = {
  Query: {
    allCommunityPosts: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<PostReturnType.CommunityPostInfo[]> => {
      let arg: ArgType.CommunityPostQuery = args.communityPostOption

      try {
        let filterSql: string = ""
        let formatSql: string = ""
        let selectionSql: string = ""
        if (Object.prototype.hasOwnProperty.call(arg, "postFilter")) {
          if (Object.prototype.hasOwnProperty.call(arg.postFilter, "searchText")) {
            let sqlResult = await GetSearchSql(arg)
            if (!sqlResult) return []
            filterSql = sqlResult.filterSql
            selectionSql = sqlResult.selectionSql
            formatSql = sqlResult.formatSql
          } else {
            formatSql = GetFormatSql(arg)
            //Get CommentCount & PickkCount
          }
          filterSql += await GetPostFilterSql(arg.postFilter)
        }

        let querySql = `
        WITH post as (
          SELECT 
            post.*, ${selectionSql} 
            COALESCE((SELECT COUNT(*) FROM "COMMUNITY_POST_FOLLOWER" pick WHERE pick."FK_postId"=post.id),0)  as "pickCount",
          COALESCE((SELECT COUNT(*) FROM "COMMUNITY_POST_COMMENT" comment WHERE comment."FK_postId"=post.id),0)  as "commentCount"
          FROM "COMMUNITY_POST" post
          ${filterSql} 
        )
        SELECT 
          user_info."name",
          user_info."profileImgUrl",
          post.*
        FROM post
        INNER JOIN "USER_INFO" user_info ON post."FK_accountId" = user_info."FK_accountId"
        WHERE post."postStatus" = 'VISIBLE' 
        ${formatSql}
        `

        let postResult: PostReturnType.CommunityPostInfo[] = await RunSingleSQL(querySql)
        let imgResult = await SequentialPromiseValue(postResult, GetCommunityPostImage)

        //Match GraphQl
        postResult.forEach((post: PostReturnType.CommunityPostInfo, index: number) => {
          post.accountId = post.FK_accountId
          post.imageUrls = []
          imgResult[index].forEach(image => {
            post.imageUrls.push(image.imageUrl)
          })
        })

        //Increase View Count
        let selectionSet: string[] = ExtractSelectionSet(info.fieldNodes[0])
        if (selectionSet.includes("content")) {
          await Promise.all(
            postResult.map(async post => {
              return IncreaseViewCountFunc("COMMUNITY", post.id)
            })
          )
        }

        logger.info(`AllCommunityPosts Called!`)
        return postResult
      } catch (e) {
        logger.warn("Failed to fetch community post from DB")
        logger.error(e.stack)
        throw new Error("[Error] Failed to fetch community post from DB")
      }
    },

    _allCommunityPostsMetadata: async (parent: void, args: QueryArgInfo): Promise<number> => {
      let arg: ArgType.CommunityPostQuery = args.communityPostOption
      try {
        let filterSql: string = ""
        if (Object.prototype.hasOwnProperty.call(arg, "postFilter")) {
          if (Object.prototype.hasOwnProperty.call(arg.postFilter, "searchText")) {
            let sqlResult = await GetSearchSql(arg)
            if (!sqlResult) return 0
            filterSql = sqlResult.filterSql
          }
          filterSql += await GetPostFilterSql(arg.postFilter)
        }

        let querySql = `
          WITH post as (
            SELECT 
              post.*
            FROM "COMMUNITY_POST" post
            ${filterSql} 
          )
          SELECT COUNT(*) FROM post
        `
        let result = await RunSingleSQL(querySql)
        return result[0].count
      } catch (e) {
        logger.warn("Failed to fetch community post count from DB")
        logger.error(e.stack)
        throw new Error("[Error] Failed to fetch community post count from DB")
      }
    },

    getUserPickkCommunityPost: async (
      parent: void,
      args: QueryArgInfo,
      ctx: void,
      info: GraphQLResolveInfo
    ): Promise<PostReturnType.CommunityPostInfo[]> => {
      let arg: ArgType.PickkCommunityPostQuery = args.pickkCommunityPostOption

      try {
        let formatSql = GetFormatSql(arg)

        let querySql = `
        WITH post as (
          SELECT post.* FROM "COMMUNITY_POST" post
          INNER JOIN "COMMUNITY_POST_FOLLOWER" follow 
          ON follow."FK_postId" = post.id
          WHERE follow."FK_accountId" = ${arg.userId}
          ${formatSql}
        )
        SELECT 
          user_info."name",
          user_info."profileImgUrl",
          post.*,
          COALESCE((SELECT COUNT(*) FROM "COMMUNITY_POST_FOLLOWER" pick WHERE pick."FK_postId"=post.id),0)  as "pickCount",
          COALESCE((SELECT COUNT(*) FROM "COMMUNITY_POST_COMMENT" comment WHERE comment."FK_postId"=post.id),0)  as "commentCount"
        FROM post
        INNER JOIN "USER_INFO" user_info ON post."FK_accountId" = user_info."FK_accountId"
        WHERE post."postStatus" = 'VISIBLE' ORDER BY post.id DESC
        `
        let postResult: PostReturnType.CommunityPostInfo[] = await RunSingleSQL(querySql)
        let imgResult = await SequentialPromiseValue(postResult, GetCommunityPostImage)

        postResult.forEach((post: PostReturnType.CommunityPostInfo, index: number) => {
          post.accountId = post.FK_accountId
          post.imageUrls = []
          imgResult[index].forEach(image => {
            post.imageUrls.push(image.imageUrl)
          })
        })
        logger.info(`userPickkCommunityPosts ${arg.userId} Called!`)
        return postResult
      } catch (e) {
        logger.warn("Failed to fetch user pick community post from DB")
        logger.error(e.stack)
        throw new Error("[Error] Failed to fetch user pick community post from DB")
      }
    },

    _getUserPickkCommunityPostMetadata: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<number> => {
      let arg: ArgType.PickkCommunityPostQuery = args.pickkCommunityPostOption

      let querySql = `
      WITH post as (
        SELECT post.* FROM "COMMUNITY_POST" post
        INNER JOIN "COMMUNITY_POST_FOLLOWER" follow 
        ON follow."FK_postId" = post.id
        WHERE follow."FK_accountId" = ${arg.userId}
      )
      SELECT COUNT(*) FROM post
      `
      let result = await RunSingleSQL(querySql)
      return result[0].count
    }
  },
  Mutation: {
    createCommunityPost: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.CommunityPostInfoInput = args.communityPostInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)

      try {
        //Insert Community Post
        let postId = await RunSingleSQL(
          `INSERT INTO "COMMUNITY_POST"("FK_accountId","title","content","postType") 
          VALUES (${arg.accountId}, '${arg.title}', '${arg.content}', '${arg.postType}') RETURNING id`
        )
        //Deploy Image
        if (Object.prototype.hasOwnProperty.call(arg, "imageUrls") && arg.imageUrls.length != 0) {
          let imgUrlList = ExtractFieldFromList(arg.imageUrls, "imageUrl")
          let deployedUrls = await SequentialPromiseValue(imgUrlList, DeployImageBy4Versions)
          let imgPairs = ConvertListToOrderedPair(deployedUrls, `,${String(postId[0].id)}`, false)
          await InsertImageIntoTable(imgPairs, "COMMUNITY_POST_IMAGE", "FK_postId")
        }
        logger.info(`Community Post has been created by User ${arg.accountId}`)
        return true
      } catch (e) {
        logger.warn("Failed to Insert into COMMUNITY_POST")
        logger.error(e.stack)
        throw new Error(`Failed to Insert into COMMUNITY_POST`)
      }
    },

    editCommunityPost: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.CommunityPostEditInfoInput = args.communityPostEditInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)
      if (!(await CheckWriter("COMMUNITY_POST", arg.postId, arg.accountId))) {
        logger.warn(`[Error] User ${arg.accountId} is not the writer of CommunityPost ${arg.postId}`)
        throw new Error(`[Error] User ${arg.accountId} is not the writer of CommunityPost ${arg.postId}`)
      }
      try {
        let querySql = GetCommunityPostEditSql(arg)
        await RunSingleSQL(`UPDATE "COMMUNITY_POST" SET "modificationTime"=now(),
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
        logger.error(e.stack)
        throw new Error(`Failed to edit Community Post`)
      }
    },

    deleteCommunityPost: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.CommunityPostDeleteInfoInput = args.communityPostDeleteInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)
      if (!(await CheckWriter("COMMUNITY_POST", arg.postId, arg.accountId))) {
        logger.warn(`[Error] User ${arg.accountId} is not the writer of CommunityPost ${arg.postId}`)
        throw new Error(`[Error] User ${arg.accountId} is not the writer of CommunityPost ${arg.postId}`)
      }

      try {
        let deleteSql = ""
        deleteSql = InsertImageIntoDeleteQueue("COMMUNITY_POST_IMAGE", "imageUrl", "FK_postId", [arg.postId])

        let querySql = `${deleteSql} UPDATE "COMMUNITY_POST" SET "postStatus"='DELETED' WHERE id=${arg.postId}`
        let result = await RunSingleSQL(querySql)
        logger.info(`Deleted CommunityPost id ${arg.accountId}`)
        return true
      } catch (e) {
        logger.warn(`Delete CommunityPost id: ${arg.postId} Failed!`)
        logger.error(e.stack)
        throw new Error(`[Error] Delete CommunityPost id: ${arg.postId} Failed!`)
      }
    }
  }
}

async function GetSearchSql(arg: ArgType.CommunityPostQuery): Promise<any> {
  let indexName: string = ""
  let filterSql: string = ""
  let selectionSql: string = ""
  let formatSql: string = ""
  if (process.env.MODE == "DEPLOY") indexName = "compost"
  else indexName = "compost_test"

  let start: number = 0
  let first: number = 10
  if (arg.filterGeneral) {
    start = arg.filterGeneral.start
    first = arg.filterGeneral.first
  }

  let result = await elastic.SearchElasticSearch(elastic.elasticClient, indexName, arg.postFilter.searchText, start, first, "best_fields", [
    "title^2",
    "content^2",
    "name"
  ])
  let extractedPostIds = ExtractFieldFromList(result.hits, "_id")
  if (extractedPostIds.length == 0) return null
  filterSql = `
    JOIN (
      VALUES
      ${ConvertListToOrderedPair(extractedPostIds)}
    ) AS x (id,ordering) ON post.id = x.id
  `

  selectionSql = `x.ordering, `
  formatSql = `ORDER BY post.ordering ASC`

  return {
    filterSql,
    selectionSql,
    formatSql
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

  return resultSql
}
