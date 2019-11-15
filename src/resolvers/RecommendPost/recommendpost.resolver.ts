import { GraphQLResolveInfo } from "graphql"

import * as ArgType from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { QueryArgInfo } from "./type/ArgType"
import { MutationArgInfo } from "./type/ArgType"

import { GetMetaData, SequentialPromiseValue, RunSingleSQL, DeployImageBy3Version } from "../Utils/promiseUtil"
import {
  GetFormatSql,
  MakeMultipleQuery,
  logWithDate,
  ConvertListToString,
  MakeCacheNameByObject,
  getFormatDate,
  getFormatHour,
  IsNewImage,
  InsertImageIntoDeleteQueue
} from "../Utils/stringUtil"

import { InsertItemForRecommendPost } from "../Item/util"
import { InsertItemReview, EditReview } from "../Review/util"
import { performance } from "perf_hooks"
import { GetRecommendPostList } from "./util"
import { ValidateUser } from "../Utils/securityUtil"
import { GetRedis, SetRedis, DelCacheByPattern } from "../../database/redisConnect"
import { IncreaseViewCountFunc } from "../Common/util"

module.exports = {
  Query: {
    allRecommendPosts: async (parent: void, args: QueryArgInfo, ctx: any, info: GraphQLResolveInfo): Promise<ReturnType.RecommendPostInfo[]> => {
      let arg: ArgType.RecommendPostQuery = args.recommendPostOption
      let cacheName = "allRecom"
      try {
        cacheName += MakeCacheNameByObject(arg.filterGeneral)
        cacheName += MakeCacheNameByObject(arg.postFilter)
        let recomPostCache: any = await GetRedis(cacheName)
        if (recomPostCache != null) {
          let parsedPosts: ReturnType.RecommendPostInfo[] = JSON.parse(recomPostCache)
          await Promise.all(
            parsedPosts.map((post: any) => {
              post.time = Date.parse(post.time)
              if (Object.prototype.hasOwnProperty.call(post, "reviews")) {
                return IncreaseViewCountFunc("RECOMMEND", post.id)
              }
            })
          )
          logWithDate("allRecommendPosts Cache Return")
          return parsedPosts
        }
      } catch (e) {
        logWithDate("[Error] Redis Command Error")
        logWithDate(e)
      }

      try {
        let filterSql: string = ""
        if (Object.prototype.hasOwnProperty.call(arg, "postFilter")) {
          filterSql = await GetPostFilterSql(arg.postFilter)
          if (filterSql == null) {
            return []
          }
        }

        let formatSql = GetFormatSql(arg)
        let postSql = `
        WITH post AS 
        ( 
          SELECT 
            rec_post.*,
            (SELECT COUNT(*) AS "commentCount" FROM "RECOMMEND_POST_COMMENT" rec_comment WHERE rec_comment."FK_postId"=rec_post.id),
            (SELECT COUNT(*) AS "pickCount" FROM "RECOMMEND_POST_FOLLOWER" follow WHERE follow."FK_postId"=rec_post.id)
          FROM "RECOMMEND_POST" rec_post ${filterSql}
        ) 
        SELECT 
          post.*, user_info.name, user_info."profileImgUrl" as "profileImageUrl"
        FROM "USER_INFO" AS user_info 
        INNER JOIN post ON post."FK_accountId" = user_info."FK_accountId" 
        WHERE post."pickCount" >= ${arg.postFilter.minimumPickCount}
        ${formatSql}
        `
        let postResult = await GetRecommendPostList(postSql, info)
        logWithDate(`allRecommendPosts Called`)
        try {
          await SetRedis(cacheName, JSON.stringify(postResult), 180)
        } catch (e) {
          logWithDate(e)
        }
        return postResult
      } catch (e) {
        logWithDate(e)
        throw new Error("[Error] Failed to load RecommendPost data from DB")
      }
    },

    _allRecommendPostsMetadata: async (parent: void, args: QueryArgInfo): Promise<number> => {
      return GetMetaData("RECOMMEND_POST")
    },

    getUserPickkRecommendPost: async (
      parent: void,
      args: QueryArgInfo,
      ctx: any,
      info: GraphQLResolveInfo
    ): Promise<ReturnType.RecommendPostInfo[]> => {
      let arg: ArgType.PickkRecommendPostQuery = args.pickkRecommendPostOption
      if (!ValidateUser(ctx, arg.userId)) throw new Error(`[Error] Unauthorized User`)
      try {
        let formatSql = GetFormatSql(arg)
        let postSql = `
          WITH post_id as (
          SELECT
            follower."FK_postId"
          FROM "RECOMMEND_POST_FOLLOWER" follower
          WHERE follower."FK_accountId"=${arg.userId}
          )
          SELECT
            post.*,user_info.name,user_info."profileImgUrl" as "profileImageUrl",
            (SELECT COUNT(*) AS "commentCount" FROM "RECOMMEND_POST_COMMENT" rec_comment WHERE rec_comment."FK_postId"=post.id),
            (SELECT COUNT(*) AS "pickCount" FROM "RECOMMEND_POST_FOLLOWER" follow WHERE follow."FK_postId"=post.id)
          FROM "RECOMMEND_POST" as post
          INNER JOIN post_id on post.id = post_id."FK_postId"
          INNER JOIN "USER_INFO" user_info ON user_info."FK_accountId" = post."FK_accountId"
          ${formatSql}`
        let postResult = await GetRecommendPostList(postSql, info)
        logWithDate(`userPickkRecommendPost Called`)
        return postResult
      } catch (e) {
        logWithDate(e)
        throw new Error("[Error] Failed to load Picked RecommendPost data from DB")
      }
    }

    //getTempSavedRecommendPost: async (parent: void, args: QueryArgInfo, ctx: any, info: GraphQLResolveInfo): Promise<> => {}
  },
  Mutation: {
    createRecommendPost: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.RecommendPostInfoInput = args.recommendPostInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)

      try {
        await DelCacheByPattern("allRecom*")
      } catch (e) {
        logWithDate(e)
      }

      let recommendPostId: number
      try {
        let deployImageUrl = await DeployImageBy3Version(arg.titleImageUrl)

        if (arg.styleType === undefined) arg.styleType = "NONE"
        let insertResult = await RunSingleSQL(
          `INSERT INTO "RECOMMEND_POST"
          ("FK_accountId","title","content","postType","styleType","titleType","titleYoutubeUrl","titleImageUrl") 
          VALUES (${arg.accountId}, '${arg.title}', '${arg.content}', '${arg.postType}', '${arg.styleType}', 
          '${arg.titleType}', '${arg.titleYoutubeUrl}', '${deployImageUrl}') RETURNING id`
        )
        recommendPostId = insertResult[0].id
      } catch (e) {
        logWithDate("[Error] Failed to Insert into RECOMMEND_POST")
        logWithDate(e)
        return false
      }

      try {
        let ItemResult = await SequentialPromiseValue(arg.reviews, InsertItemForRecommendPost)
        for (let index = 0; index < arg.reviews.length; index++) {
          await InsertItemReview(arg.reviews[index], [recommendPostId, arg.accountId, index])
        }
        logWithDate(`Recommend Post created by User${arg.accountId}`)
        return true
      } catch (e) {
        logWithDate("[Error] Failed to create RecommendPost")
        logWithDate(e)
        await RunSingleSQL(`DELETE FROM "RECOMMEND_POST" WHERE id = ${recommendPostId}`)
        return false
      }
    },

    editRecommendPost: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.RecommendPostEditInfoInput = args.recommendPostEditInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)

      try {
        await DelCacheByPattern("allRecom*")
      } catch (e) {
        logWithDate(e)
      }

      try {
        let setSql = await GetEditSql(arg)
        //Edit others
        await RunSingleSQL(setSql)
        //Delete Images
        if (Object.prototype.hasOwnProperty.call(arg, "deletedImages")) {
          if (arg.deletedImages.length != 0) {
            let deleteSql = ""
            deleteSql = InsertImageIntoDeleteQueue("ITEM_REVIEW_IMAGE", "imageUrl", "id", arg.deletedImages)

            let idList = ConvertListToString(arg.deletedImages)
            await RunSingleSQL(`
            ${deleteSql}
            DELETE FROM "ITEM_REVIEW_IMAGE" WHERE id IN (${idList})
          `)
          }
        }

        if (Object.prototype.hasOwnProperty.call(arg, "deletedReviews")) {
          if (arg.deletedReviews.length != 0) {
            let deleteSql = ""
            deleteSql = InsertImageIntoDeleteQueue("ITEM_REVIEW_IMAGE", "imageUrl", "FK_reviewId", arg.deletedReviews)

            let idList = ConvertListToString(arg.deletedReviews)
            await RunSingleSQL(`
            DELETE FROM "ITEM_REVIEW" WHERE id IN (${idList})
          `)
          }
        }

        //Edit Review
        if (Object.prototype.hasOwnProperty.call(arg, "reviews")) {
          await Promise.all(
            arg.reviews.map((review, index) => {
              return EditReview(review, [arg.postId, arg.accountId, index])
            })
          )
        }
        logWithDate(`Edited RecommendPost ${arg.postId}`)
        return true
      } catch (e) {
        logWithDate("[Error] Failed to Edit RecommendPost")
        logWithDate(e)
        return false
      }
    },

    deleteRecommendPost: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.RecommendPostDeleteInfoInput = args.recommendPostDeleteInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)

      try {
        await DelCacheByPattern("allRecom*")
      } catch (e) {
        logWithDate(e)
      }

      try {
        let query = `
        WITH review AS (
          SELECT * FROM "ITEM_REVIEW" WHERE "FK_postId"=${arg.postId}
        ),
        bbb AS (
          INSERT INTO "IMAGE_DELETE"("imageUrl")
          SELECT image."imageUrl" as "imageUrl" FROM "ITEM_REVIEW_IMAGE" image,review WHERE image."FK_reviewId" = review.id
        ),
        ccc AS (
          INSERT INTO "IMAGE_DELETE"("imageUrl")
	        SELECT rec."titleImageUrl" as "imageUrl" FROM "RECOMMEND_POST" rec WHERE rec.id=${arg.postId}
        )
		    DELETE FROM "RECOMMEND_POST" WHERE id=${arg.postId}
        `
        let result = await RunSingleSQL(query)

        logWithDate(`DELETE FROM "RECOMMEND_POST" WHERE id=${arg.postId}`)
        return true
      } catch (e) {
        logWithDate(`[Error] Delete RecommendPost id: ${arg.postId} Failed!`)
        logWithDate(e)
        throw new Error(`[Error] Delete RecommendPost id: ${arg.postId} Failed!`)
      }
    },

    tempSaveRecommendPost: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.RecommendPostTempSaveInfoInput = args.recommendPostTempSaveInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)

      let cacheName = `recomCache_${String(arg.accountId)}_` + getFormatDate(new Date()) + getFormatHour(new Date())
      try {
        SetRedis(cacheName, arg.content, 604800)
        logWithDate(`RecommendPost Temporary Save! Cache key: ${cacheName}`)
        return true
      } catch (e) {
        logWithDate("[Error] Failed to temporarily save Recommend Post")
        logWithDate(e)
        return false
      }
    }
  }
}

async function GetPostFilterSql(filter: any): Promise<string> {
  let multipleQuery: boolean = false
  let filterSql: string = ""

  if (Object.prototype.hasOwnProperty.call(filter, "accountId")) {
    filterSql = ` where "FK_accountId"=${filter.accountId}`
    multipleQuery = true
  } else if (Object.prototype.hasOwnProperty.call(filter, "postId")) {
    filterSql = ` where id=${filter.postId}`
    multipleQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "postType")) {
    filterSql = MakeMultipleQuery(multipleQuery, filterSql, ` "postType"='${filter.postType}'`)
    multipleQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "channelId")) {
    filterSql = MakeMultipleQuery(multipleQuery, filterSql, ` "FK_channelId"='${filter.channelId}'`)
    multipleQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "styleType")) {
    filterSql = MakeMultipleQuery(multipleQuery, filterSql, ` "styleType"='${filter.styleType}'`)
    multipleQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "itemId")) {
    try {
      let rows = await RunSingleSQL(`SELECT "FK_postId" FROM "ITEM_REVIEW" WHERE "FK_itemId"=${filter.itemId}`)
      if (rows.length == 0) return null

      let postIdSql = ""
      rows.forEach((row: any, index: number) => {
        if (index != 0) postIdSql += ","
        postIdSql += row.FK_postId
      })

      filterSql = MakeMultipleQuery(multipleQuery, filterSql, ` id in (${postIdSql})`)
      multipleQuery = true
    } catch (e) {
      throw new Error("[Error] Failed to fetch postId with itemId")
    }
  }

  return filterSql
}

async function GetEditSql(filter: ArgType.RecommendPostEditInfoInput): Promise<string> {
  let isMultiple = false
  let resultSql = `UPDATE "RECOMMEND_POST" SET `

  if (Object.prototype.hasOwnProperty.call(filter, "title")) {
    if (isMultiple) resultSql += ", "
    resultSql += `"title" = '${filter.title}'`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "content")) {
    if (isMultiple) resultSql += ", "
    resultSql += `"content" = '${filter.content}'`
    isMultiple = true
  }
  if (Object.prototype.hasOwnProperty.call(filter, "postType")) {
    if (isMultiple) resultSql += ", "
    resultSql += `"postType"='${filter.postType}'`
    isMultiple = true
  }
  if (Object.prototype.hasOwnProperty.call(filter, "styleType")) {
    if (isMultiple) resultSql += ", "
    resultSql += `"styleType"='${filter.styleType}'`
    isMultiple = true
  }
  if (Object.prototype.hasOwnProperty.call(filter, "saleEndDate")) {
    if (isMultiple) resultSql += ", "
    resultSql += `"saleEndDate"='${filter.saleEndDate}'`
    isMultiple = true
  }
  if (Object.prototype.hasOwnProperty.call(filter, "titleType")) {
    if (isMultiple) resultSql += ", "
    resultSql += `"titleType"='${filter.titleType}'`
    isMultiple = true
  }
  if (Object.prototype.hasOwnProperty.call(filter, "titleImageUrl")) {
    if (IsNewImage(filter.titleImageUrl)) {
      resultSql = InsertImageIntoDeleteQueue("RECOMMEND_POST", "titleImageUrl", "id", [filter.postId]) + resultSql
      filter.titleImageUrl = await DeployImageBy3Version(filter.titleImageUrl)
    }
    if (isMultiple) resultSql += ", "
    resultSql += `"titleImageUrl" = '${filter.titleImageUrl}'`
    isMultiple = true
  }
  if (Object.prototype.hasOwnProperty.call(filter, "titleYoutubeUrl")) {
    if (isMultiple) resultSql += ", "
    resultSql += `"titleYoutubeUrl"='${filter.titleYoutubeUrl}'`
    isMultiple = true
  }

  resultSql += `WHERE "id"=${filter.postId}`

  return resultSql
}
