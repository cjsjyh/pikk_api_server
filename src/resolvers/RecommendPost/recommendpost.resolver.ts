import { GraphQLResolveInfo } from "graphql"

import * as ArgType from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { QueryArgInfo } from "./type/ArgType"
import { MutationArgInfo } from "./type/ArgType"

import {
  GetMetaData,
  SequentialPromiseValue,
  RunSingleSQL,
  DeployImageBy4Versions,
  ExtractFieldFromList
} from "../Utils/promiseUtil"
import {
  GetFormatSql,
  MakeMultipleQuery,
  ConvertListToString,
  MakeCacheNameByObject,
  getFormatDate,
  getFormatHour,
  IsNewImage,
  InsertImageIntoDeleteQueue,
  ConvertListToOrderedPair,
  formatSingleQuoteForString
} from "../Utils/stringUtil"

import { InsertItemForRecommendPost } from "../Item/util"
import { InsertItemReview, EditReview } from "../Review/util"
import { performance } from "perf_hooks"
import { GetRecommendPostList } from "./util"
import { ValidateUser, CheckWriter } from "../Utils/securityUtil"
import { GetRedis, SetRedis, DelCacheByPattern } from "../../database/redisConnect"
import { IncreaseViewCountFunc } from "../Common/util"
import { InsertIntoNotificationQueue } from "../Notification/util"
import { DoPropertiesExist } from "../Utils/arrayUtil"
var logger = require("../../tools/logger")
var elastic = require("../../database/elasticConnect")

module.exports = {
  Query: {
    allRecommendPosts: async (
      parent: void,
      args: QueryArgInfo,
      ctx: any,
      info: GraphQLResolveInfo
    ): Promise<ReturnType.RecommendPostInfo[]> => {
      let arg: ArgType.RecommendPostQuery = args.recommendPostOption
      let cacheName = "allRecom"
      //Get Cached Content
      try {
        cacheName += MakeCacheNameByObject(arg)
        let recomPostCache: any = await GetRedis(cacheName)
        if (recomPostCache != null) {
          //Increae View if this cache has complete recommend post
          let parsedPosts: ReturnType.RecommendPostInfo[] = JSON.parse(recomPostCache)
          await Promise.all(
            parsedPosts.map((post: any) => {
              post.time = Date.parse(post.time)
              if (Object.prototype.hasOwnProperty.call(post, "reviews")) {
                return IncreaseViewCountFunc("RECOMMEND", post.id)
              }
            })
          )
          logger.info(`allRecommendPosts Cache Return ${cacheName}`)
          return parsedPosts
        }
      } catch (e) {
        logger.warn("Redis Command Error")
        logger.error(e.stack)
      }

      try {
        let filterSql: string = ""
        let pickCountSql: string = ""
        let selectionSql: string = ""
        let formatSql: string = ""
        if (Object.prototype.hasOwnProperty.call(arg, "postFilter")) {
          //If search is required
          if (Object.prototype.hasOwnProperty.call(arg.postFilter, "searchText")) {
            let sqlResult = await GetSearchSql(arg)
            if (!sqlResult) {
              return []
            }

            filterSql = sqlResult.filterSql
            selectionSql = sqlResult.selectionSql
            formatSql = sqlResult.formatSql
          }
          //If Queried from DB
          else {
            filterSql = await GetPostFilterSql(arg.postFilter)
            if (!filterSql) return []

            formatSql = GetFormatSql(arg)
          }

          if (Object.prototype.hasOwnProperty.call(arg.postFilter, "minimumPickCount"))
            pickCountSql = `WHERE post."pickCount" >= ${arg.postFilter.minimumPickCount}`
        }

        let postSql = `
        WITH post AS 
        ( 
          SELECT 
            rec_post.*, ${selectionSql}
            (SELECT COUNT(*) AS "commentCount" FROM "RECOMMEND_POST_COMMENT" rec_comment WHERE rec_comment."FK_postId"=rec_post.id),
            (SELECT COUNT(*) AS "pickCount" FROM "RECOMMEND_POST_FOLLOWER" follow WHERE follow."FK_postId"=rec_post.id)
          FROM "RECOMMEND_POST" rec_post ${filterSql}
        ) 
        SELECT 
          post.*, user_info.name, user_info."profileImgUrl" as "profileImageUrl"
        FROM "USER_INFO" AS user_info 
        INNER JOIN post ON post."FK_accountId" = user_info."FK_accountId" 
        ${pickCountSql}
        ${formatSql}
        `
        let postResult = await GetRecommendPostList(postSql, info)
        logger.info(`allRecommendPosts Called`)
        try {
          await SetRedis(cacheName, JSON.stringify(postResult), 180)
        } catch (e) {
          logger.warn(`Failed to set recommend post cache`)
          logger.error(e.stack)
        }
        return postResult
      } catch (e) {
        logger.error(e.stack)
        throw new Error("[Error] Failed to load RecommendPost data from DB")
      }
    },

    _allRecommendPostsMetadata: async (parent: void, args: QueryArgInfo): Promise<number> => {
      let arg: ArgType.RecommendPostQuery = args.recommendPostOption
      try {
        let filterSql: string = ""
        let pickCountSql: string = ""
        if (Object.prototype.hasOwnProperty.call(arg, "postFilter")) {
          //If search is required
          if (Object.prototype.hasOwnProperty.call(arg.postFilter, "searchText")) {
            let sqlResult = await GetSearchSql(arg)
            if (!sqlResult.hitCount) return 0
            return sqlResult.hitCount
          }
          //If Queried from DB
          else {
            filterSql = await GetPostFilterSql(arg.postFilter)
            if (filterSql == null) return 0
          }

          if (Object.prototype.hasOwnProperty.call(arg.postFilter, "minimumPickCount"))
            pickCountSql = `AND post."pickCount" >= ${arg.postFilter.minimumPickCount}`
        }

        let postSql = `
        WITH post AS 
        ( 
          SELECT 
            rec_post.*,
            (SELECT COUNT(*) AS "pickCount" FROM "RECOMMEND_POST_FOLLOWER" follow WHERE follow."FK_postId"=rec_post.id)
          FROM "RECOMMEND_POST" rec_post ${filterSql}
        ) 
        SELECT 
          COUNT(*) 
        FROM post WHERE "postStatus" = 'VISIBLE'
        ${pickCountSql}
        `
        let result = await RunSingleSQL(postSql)
        return result[0].count
      } catch (e) {
        logger.error(e.stack)
        throw new Error("[Error] Failed to load RecommendPost count from DB")
      }
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
          WHERE post."postStatus" = 'VISIBLE'
          ${formatSql}`
        let postResult = await GetRecommendPostList(postSql, info)
        logger.info(`userPickkRecommendPost Called`)
        return postResult
      } catch (e) {
        logger.warn("Failed to load Picked RecommendPost data from DB")
        logger.error(e.stack)
        throw new Error("[Error] Failed to load Picked RecommendPost data from DB")
      }
    },

    _getUserPickkRecommendPostMetadata: async (
      parent: void,
      args: QueryArgInfo
    ): Promise<number> => {
      let arg: ArgType.PickkRecommendPostQuery = args.pickkRecommendPostOption
      let postSql = `
        SELECT COUNT(*) FROM "RECOMMEND_POST_FOLLOWER" follower WHERE follower."FK_accountId"=${arg.userId}
      `
      let postCount = await RunSingleSQL(postSql)
      return postCount[0].count
    },

    getUserFollowRecommendPost: async (
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
          WITH post AS (
            SELECT rec.* FROM "CHANNEL_FOLLOWER" follow
            INNER JOIN "RECOMMEND_POST" rec ON rec."FK_accountId" = follow."FK_channelId"
            WHERE follow."FK_accountId" = ${arg.userId} AND rec."postStatus" = 'VISIBLE'
          )
          SELECT
            post.*, user_info.name, user_info."profileImgUrl" as "profileImageUrl",
            (SELECT COUNT(*) AS "commentCount" FROM "RECOMMEND_POST_COMMENT" rec_comment WHERE rec_comment."FK_postId"=post.id),
            (SELECT COUNT(*) AS "pickCount" FROM "RECOMMEND_POST_FOLLOWER" follow WHERE follow."FK_postId"=post.id)
          FROM post
          INNER JOIN "USER_INFO" user_info ON user_info."FK_accountId" = post."FK_accountId"
          ${formatSql}`
        let postResult = await GetRecommendPostList(postSql, info)
        logger.info(`userFollowRecommendPost Called`)
        return postResult
      } catch (e) {
        logger.warn("Failed to load Follow RecommendPost data from DB")
        logger.error(e.stack)
        throw new Error("[Error] Failed to load Follow RecommendPost data from DB")
      }
    },

    _getUserFollowRecommendPostMetadata: async (
      parent: void,
      args: QueryArgInfo,
      ctx: any,
      info: GraphQLResolveInfo
    ): Promise<ReturnType.RecommendPostInfo[]> => {
      let arg: ArgType.PickkRecommendPostQuery = args.pickkRecommendPostOption
      if (!ValidateUser(ctx, arg.userId)) throw new Error(`[Error] Unauthorized User`)
      try {
        let postSql = `
        WITH post AS (
          SELECT rec.* FROM "CHANNEL_FOLLOWER" follow
          INNER JOIN "RECOMMEND_POST" rec ON rec."FK_accountId" = follow."FK_channelId"
          WHERE follow."FK_accountId" = ${arg.userId} AND rec."postStatus" = 'VISIBLE'
        )
        SELECT COUNT(*) FROM post
        `
        let postCount = await RunSingleSQL(postSql)
        return postCount[0].count
      } catch (e) {
        logger.warn("Failed to load Follow RecommendPost data from DB")
        logger.error(e.stack)
        throw new Error("[Error] Failed to load Follow RecommendPost data from DB")
      }
    }

    //getTempSavedRecommendPost: async (parent: void, args: QueryArgInfo, ctx: any, info: GraphQLResolveInfo): Promise<> => {}
  },
  Mutation: {
    createRecommendPost: async (
      parent: void,
      args: MutationArgInfo,
      ctx: any
    ): Promise<Boolean> => {
      let arg: ArgType.RecommendPostInfoInput = args.recommendPostInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)

      //Delete Cache
      try {
        if (arg.postType == "REVIEW") await DelCacheByPattern("allRecom*DESCtimeREVIEW*")
        if (arg.postType == "LOOK") await DelCacheByPattern("allRecom*DESCtimeLOOK*")
        logger.info(`Deleted recommend post cache`)
      } catch (e) {
        logger.warn(`Faield to delete recommend post cache`)
        logger.error(e.stack)
        throw new Error("Faield to delete recommend post cache")
      }

      let recommendPostId: number
      try {
        //Deploy title image if it exists
        let deployImageUrl = ""
        try {
          if (arg.titleType == "IMAGE" && arg.titleImageUrl != null)
            deployImageUrl = await DeployImageBy4Versions(arg.titleImageUrl)
        } catch (e) {
          logger.warn("Failed to deploy titleImage")
          logger.error(e.stack)
        }

        //Deploy RecommendPost Body
        if (!arg.styleType) arg.styleType = "NONE"
        formatSingleQuoteForString(arg)
        let insertResult = await RunSingleSQL(
          `INSERT INTO "RECOMMEND_POST"
          ("FK_accountId","title","content","postType","styleType","titleType","titleYoutubeUrl","titleImageUrl") 
          VALUES (${arg.accountId}, '${arg.title}', '${arg.content}', '${arg.postType}', '${arg.styleType}', 
          '${arg.titleType}', '${arg.titleYoutubeUrl}', '${deployImageUrl}') RETURNING id`
        )
        recommendPostId = insertResult[0].id
      } catch (e) {
        logger.warn("Failed to Insert into RECOMMEND_POST")
        logger.error(e.stack)
        throw new Error("Failed to Insert into RECOMMEND_POST")
      }

      try {
        //Insert Item Info
        let ItemResult = await SequentialPromiseValue(arg.reviews, InsertItemForRecommendPost)
        //Insert Item Review
        for (let index = 0; index < arg.reviews.length; index++) {
          await InsertItemReview(arg.reviews[index], [recommendPostId, arg.accountId, index])
        }
        logger.info(`Recommend Post created by User${arg.accountId}`)

        //Notify Followers
        InsertIntoNotificationQueue(
          "NEW_RECOMMEND_POST_BY_MY_PICKK_CHANNEL",
          recommendPostId,
          "RECOMMEND",
          arg.title,
          "",
          -1,
          arg.accountId
        )

        return true
      } catch (e) {
        //If creation failed after creating the body, delete body
        await RunSingleSQL(`DELETE FROM "RECOMMEND_POST" WHERE id = ${recommendPostId}`)
        logger.warn("Failed to insert Item or Review for RecommendPost")
        logger.error(e)
        throw new Error("Failed to insert Item or Review for RecommendPost")
      }
    },

    editRecommendPost: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.RecommendPostEditInfoInput = args.recommendPostEditInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)
      if (!(await CheckWriter("RECOMMEND_POST", arg.postId, arg.accountId))) {
        logger.warn(
          `[Error] User ${arg.accountId} is not the writer of RecommendPost ${arg.postId}`
        )
        throw new Error(
          `[Error] User ${arg.accountId} is not the writer of RecommendPost ${arg.postId}`
        )
      }
      try {
        if (arg.postType == "REVIEW") await DelCacheByPattern("allRecom*DESCtimeREVIEW*")
        if (arg.postType == "LOOK") await DelCacheByPattern("allRecom*DESCtimeLOOK*")
        await DelCacheByPattern("allRecom01DESCtime" + String(arg.postId) + "*")
        logger.info(`Deleted recommend post cache`)
      } catch (e) {
        logger.warn(`Faield to delete recommend post cache`)
        logger.error(e.stack)
      }

      try {
        formatSingleQuoteForString(arg)
        //Edit Main Body
        let setSql = await GetEditSql(arg)
        await RunSingleSQL(setSql)
        //Delete Images
        if (Object.prototype.hasOwnProperty.call(arg, "deletedImages")) {
          if (arg.deletedImages.length != 0) {
            let deleteSql = ""
            deleteSql = InsertImageIntoDeleteQueue(
              "ITEM_REVIEW_IMAGE",
              "imageUrl",
              "id",
              arg.deletedImages
            )

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
            deleteSql = InsertImageIntoDeleteQueue(
              "ITEM_REVIEW_IMAGE",
              "imageUrl",
              "FK_reviewId",
              arg.deletedReviews
            )

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
        logger.info(`Edited RecommendPost ${arg.postId}`)
        return true
      } catch (e) {
        logger.warn("Failed to Edit RecommendPost")
        logger.error(e.stack)
        throw new Error("Failed to Edit RecommendPost")
      }
    },

    deleteRecommendPost: async (
      parent: void,
      args: MutationArgInfo,
      ctx: any
    ): Promise<Boolean> => {
      let arg: ArgType.RecommendPostDeleteInfoInput = args.recommendPostDeleteInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)
      if (!(await CheckWriter("RECOMMEND_POST", arg.postId, arg.accountId))) {
        logger.warn(
          `[Error] User ${arg.accountId} is not the writer of RecommendPost ${arg.postId}`
        )
        throw new Error(
          `[Error] User ${arg.accountId} is not the writer of RecommendPost ${arg.postId}`
        )
      }

      try {
        await DelCacheByPattern("allRecom*DESCtimeREVIEW*")
        await DelCacheByPattern("allRecom*DESCtimeLOOK*")
        logger.info(`Deleted recommend post cache`)
      } catch (e) {
        logger.warn(`Faield to delete recommend post cache`)
        logger.error(e.stack)
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
        ),
        delFollow AS (
          DELETE FROM "RECOMMEND_POST_FOLLOWER" WHERE "FK_postId" = ${arg.postId}
        )
		    UPDATE "RECOMMEND_POST" SET "postStatus"='DELETED'  WHERE id=${arg.postId}
        `
        let result = await RunSingleSQL(query)

        logger.info(`DELETE RECOMMEND_POST id=${arg.postId}`)
        return true
      } catch (e) {
        logger.warn(`Delete RecommendPost id: ${arg.postId} Failed!`)
        logger.error(e.stack)
        throw new Error(`[Error] Delete RecommendPost id: ${arg.postId} Failed!`)
      }
    },

    tempSaveRecommendPost: async (
      parent: void,
      args: MutationArgInfo,
      ctx: any
    ): Promise<Boolean> => {
      let arg: ArgType.RecommendPostTempSaveInfoInput = args.recommendPostTempSaveInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)

      let cacheName =
        `recomCache_${String(arg.accountId)}_` +
        getFormatDate(new Date()) +
        getFormatHour(new Date())
      try {
        SetRedis(cacheName, arg.content, 604800)
        logger.info(`RecommendPost Temporary Save! Cache key: ${cacheName}`)
        return true
      } catch (e) {
        logger.warn("Failed to temporarily save Recommend Post")
        logger.error(e.stack)
        throw new Error("Failed to temporarily save Recommend Post")
      }
    }
  }
}

async function GetPostFilterSql(filter: ArgType.RecommendPostQueryFilter): Promise<string> {
  let multipleWhereQuery: boolean = true
  let multipleJoinQuery: boolean = false
  let filterWhereSql: string = ` WHERE rec_post."postStatus" = 'VISIBLE'`
  let filterJoinSql: string = ""

  //if recommendReason exists
  if (filter.recommendReason && filter.recommendReason.length != 0) {
    filterJoinSql += `INNER JOIN "ITEM_REVIEW" review ON review."FK_postId" = rec_post.id`

    filterWhereSql = MakeMultipleQuery(
      multipleWhereQuery,
      filterWhereSql,
      ` review."recommendReason" = ${ConvertListToString(
        filter.recommendReason,
        `OR review."recommendReason"=`,
        "'"
      )}`
    )
    multipleJoinQuery = true
  }

  //if any of item category exists
  if (DoPropertiesExist(filter, ["itemMajorType", "itemMinorType", "itemFinalType"], "OR", true)) {
    //join related tables
    if (!multipleJoinQuery)
      filterJoinSql += `INNER JOIN "ITEM_REVIEW" review ON review."FK_postId" = rec_post.id`

    filterJoinSql += `
    INNER JOIN "ITEM_VARIATION" item_var ON review."FK_itemId" = item_var.id
    INNER JOIN "ITEM_GROUP" item_gr ON item_var."FK_itemGroupId" = item_gr.id 
    `

    //add filtering
    if (DoPropertiesExist(filter, ["itemMajorType"], "AND", true))
      filterWhereSql = MakeMultipleQuery(
        multipleWhereQuery,
        filterWhereSql,
        ` (item_gr."itemMajorType" = ${ConvertListToString(
          filter.itemMajorType,
          `OR item_gr."itemMajorType"=`,
          "'"
        )})`
      )
    if (DoPropertiesExist(filter, ["itemMinorType"], "AND", true))
      filterWhereSql = MakeMultipleQuery(
        multipleWhereQuery,
        filterWhereSql,
        ` (item_gr."itemMinorType" = ${ConvertListToString(
          filter.itemMinorType,
          `OR item_gr."itemMinorType"=`,
          "'"
        )})`
      )
    if (DoPropertiesExist(filter, ["itemFinalType"], "AND", true))
      filterWhereSql = MakeMultipleQuery(
        multipleWhereQuery,
        filterWhereSql,
        ` (item_gr."itemFinalType" = ${ConvertListToString(
          filter.itemFinalType,
          `OR item_gr."itemFinalType"=`,
          "'"
        )})`
      )
    multipleJoinQuery = true
  }

  if (filter.accountId) {
    filterWhereSql = MakeMultipleQuery(
      multipleWhereQuery,
      filterWhereSql,
      ` rec_post."FK_accountId"=${filter.accountId}`
    )
  } else if (filter.postId) {
    filterWhereSql = MakeMultipleQuery(
      multipleWhereQuery,
      filterWhereSql,
      ` rec_post.id=${filter.postId}`
    )
  }

  if (filter.postType) {
    filterWhereSql = MakeMultipleQuery(
      multipleWhereQuery,
      filterWhereSql,
      ` rec_post."postType"='${filter.postType}'`
    )
  }

  if (filter.styleType) {
    filterWhereSql = MakeMultipleQuery(
      multipleWhereQuery,
      filterWhereSql,
      ` rec_post."styleType"='${filter.styleType}'`
    )
  }

  if (Object.prototype.hasOwnProperty.call(filter, "itemId")) {
    try {
      let rows = await RunSingleSQL(
        `SELECT "FK_postId" FROM "ITEM_REVIEW" WHERE "FK_itemId"=${filter.itemId}`
      )
      if (rows.length == 0) return null

      let postIdSql = ""
      rows.forEach((row: any, index: number) => {
        if (index != 0) postIdSql += ","
        postIdSql += row.FK_postId
      })

      filterWhereSql = MakeMultipleQuery(
        multipleWhereQuery,
        filterWhereSql,
        ` rec_post.id in (${postIdSql})`
      )
    } catch (e) {
      throw new Error("[Error] Failed to fetch postId with itemId")
    }
  }

  if (multipleJoinQuery) filterWhereSql += ` GROUP BY rec_post.id`

  return filterJoinSql + filterWhereSql
}

async function GetEditSql(filter: ArgType.RecommendPostEditInfoInput): Promise<string> {
  let isMultiple = true
  let resultSql = `UPDATE "RECOMMEND_POST" SET "modificationTime"=now() `

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

    if (
      Object.prototype.hasOwnProperty.call(filter, "titleImageUrl") &&
      filter.titleImageUrl != null &&
      filter.titleType == "IMAGE"
    ) {
      if (IsNewImage(filter.titleImageUrl)) {
        resultSql =
          InsertImageIntoDeleteQueue("RECOMMEND_POST", "titleImageUrl", "id", [filter.postId]) +
          resultSql
        filter.titleImageUrl = await DeployImageBy4Versions(filter.titleImageUrl)
      }
      if (isMultiple) resultSql += ", "
      resultSql += `"titleImageUrl" = '${filter.titleImageUrl}'`
      isMultiple = true
    }
    if (
      Object.prototype.hasOwnProperty.call(filter, "titleYoutubeUrl") &&
      filter.titleType == "YOUTUBE"
    ) {
      if (isMultiple) resultSql += ", "
      resultSql += `"titleYoutubeUrl"='${filter.titleYoutubeUrl}'`
      isMultiple = true
    }
  }

  resultSql += ` WHERE "id"=${filter.postId}`

  return resultSql
}

async function GetSearchSql(arg: ArgType.RecommendPostQuery): Promise<any> {
  let indexName: string = ""
  let filterSql: string = ""
  let selectionSql: string = ""
  let formatSql: string = ""
  let hitCount: number = 0

  if (process.env.MODE == "DEPLOY") indexName = "recpost"
  else indexName = "recpost_test"

  let start: number = 0
  let first: number = 10
  if (arg.filterGeneral) {
    start = arg.filterGeneral.start
    first = arg.filterGeneral.first
  }

  let result = await elastic.SearchCollapseElasticSearch(
    elastic.elasticClient,
    indexName,
    arg.postFilter.searchText,
    start,
    first,
    "best_fields",
    ["brandkor", "content", "itemname", "name", "review", "shortreview^2", "title^3"],
    ["fk_postId"],
    "fk_postid"
  )
  let extractedPostIds = ExtractFieldFromList(result.hits.hits, "fk_postid", 1, true)
  if (extractedPostIds.length == 0) return null

  hitCount = result.aggregations.total.value
  filterSql = `
    JOIN (
      VALUES
      ${ConvertListToOrderedPair(extractedPostIds)}
    ) AS x (id,ordering) ON rec_post.id = x.id
    order by x.ordering
  `
  selectionSql = `x.ordering, `
  formatSql = `ORDER BY post.ordering ASC`

  return {
    filterSql,
    selectionSql,
    formatSql,
    hitCount
  }
}
