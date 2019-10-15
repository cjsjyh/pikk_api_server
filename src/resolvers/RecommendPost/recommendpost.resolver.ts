import { GraphQLResolveInfo } from "graphql"
import { QueryResult } from "pg"

import * as ArgType from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { QueryArgInfo } from "./type/ArgType"
import { MutationArgInfo } from "./type/ArgType"
import {
  GetMetaData,
  SequentialPromiseValue,
  RunSingleSQL,
  UploadImage
} from "../Utils/promiseUtil"
import { GetFormatSql } from "../Utils/stringUtil"
import { InsertItemForRecommendPost } from "../Item/util"
import { InsertItemReview, InsertItemReviewImage, GetReviewsByPostList } from "../Review/util"
import { performance } from "perf_hooks"
import { GetRecommendPostList } from "./util"

module.exports = {
  Query: {
    allRecommendPosts: async (
      parent: void,
      args: QueryArgInfo,
      ctx: any,
      info: GraphQLResolveInfo
    ): Promise<ReturnType.RecommendPostInfo[]> => {
      let arg: ArgType.RecommendPostQuery = args.recommendPostOption
      let queryResult: QueryResult
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
        WITH aaa AS ( SELECT * FROM "RECOMMEND_POST" ${filterSql}) 
        SELECT 
          aaa.*, bbb.name, 
          bbb."profileImgUrl",
          (SELECT COUNT(*) AS "commentCount" FROM "RECOMMEND_POST_COMMENT" rec_comment WHERE rec_comment."FK_postId"=aaa.id),
          (SELECT COUNT(*) AS "pickCount" FROM "RECOMMEND_POST_FOLLOWER" follow WHERE follow."FK_postId"=aaa.id)
        FROM "USER_INFO" AS bbb 
        INNER JOIN aaa ON aaa."FK_accountId" = bbb."FK_accountId" ${formatSql}
        `
        let postResult = await GetRecommendPostList(postSql, info)

        return postResult
      } catch (e) {
        console.log(e)
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

      let queryResult: QueryResult
      try {
        let formatSql = GetFormatSql(arg)
        let postSql = `WITH post_id as (
            SELECT "FK_postId" FROM "RECOMMEND_POST_FOLLOWER" 
            WHERE "FK_accountId"=${arg.userId}) 
          SELECT posts.*,
            (SELECT COUNT(*) as "pickCount" FROM "RECOMMEND_POST_FOLLOWER" follow 
            WHERE follow."FK_postId"=post_id.id)
          from "RECOMMEND_POST" as posts
          INNER JOIN post_id on posts.id = post_id."FK_postId" ${formatSql}`

        let postResult = await GetRecommendPostList(postSql, info)

        return postResult
      } catch (e) {
        console.log(e)
        throw new Error("[Error] Failed to load Picked RecommendPost data from DB")
      }
    }
  },
  Mutation: {
    createRecommendPost: async (
      parent: void,
      args: MutationArgInfo,
      ctx: any
    ): Promise<Boolean> => {
      if (!ctx.IsVerified) throw new Error("USER NOT LOGGED IN!")
      let arg: ArgType.RecommendPostInfoInput = args.recommendPostInfo
      let imageUrl = null
      if (arg.titleType == "IMAGE") {
        if (!Object.prototype.hasOwnProperty.call(arg, "titleImg")) {
          throw new Error("[Error] title type IMAGE but no image sent!")
        }
        imageUrl = await UploadImage(arg.titleImg)
        if (imageUrl == null) {
          throw new Error("[Error] Image Upload Failed!")
        }
      }

      let recommendPostId: number
      try {
        let insertResult = await RunSingleSQL(
          `INSERT INTO "RECOMMEND_POST"
          ("FK_accountId","title","content","postType","styleType","titleType","titleYoutubeUrl","titleImageUrl") 
          VALUES (${arg.accountId}, '${arg.title}', '${arg.content}', '${arg.postType}', '${arg.styleType}', 
          '${arg.titleType}', '${arg.titleYoutubeUrl}', '${imageUrl}') RETURNING id`
        )
        recommendPostId = insertResult[0].id
      } catch (e) {
        console.log("[Error] Failed to Insert into RECOMMEND_POST")
        console.log(e)
        return false
      }

      try {
        let ItemResult = await SequentialPromiseValue(arg.reviews, InsertItemForRecommendPost)
        let ReviewResult = await SequentialPromiseValue(arg.reviews, InsertItemReview, [
          recommendPostId
        ])
        await Promise.all(
          arg.reviews.map((review, index) => {
            return Promise.all(
              review.imgs.map(img => {
                return InsertItemReviewImage(img, ReviewResult[index])
              })
            )
          })
        )
        console.log(`Recommend Post created by User${arg.accountId}`)
        return true
      } catch (e) {
        console.log("[Error] Failed to create RecommendPost")
        console.log(e)
        return false
      }
    },

    deleteRecommendPost: async (parent: void, args: any): Promise<Boolean> => {
      try {
        let query = `DELETE FROM "RECOMMEND_POST" WHERE id=${args.postId}`
        let result = await RunSingleSQL(query)
        console.log(`DELETE FROM "RECOMMEND_POST" WHERE id=${args.postId}`)
        return true
      } catch (e) {
        console.log(`[Error] Delete RecommendPost id: ${args.postId} Failed!`)
        console.log(e)
        throw new Error(`[Error] Delete RecommendPost id: ${args.postId} Failed!`)
      }
    }
  }
}

async function GetPostFilterSql(filter: any): Promise<string> {
  let multipleQuery: Boolean = false
  let filterSql: string = ""

  if (Object.prototype.hasOwnProperty.call(filter, "accountId")) {
    filterSql = ` where "FK_accountId"=${filter.accountId}`
    multipleQuery = true
  } else if (Object.prototype.hasOwnProperty.call(filter, "postId")) {
    filterSql = ` where id=${filter.postId}`
    multipleQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "postType")) {
    if (multipleQuery) filterSql += " and"
    else filterSql += " where"
    filterSql += ` "postType"='${filter.postType}'`
    multipleQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "channelId")) {
    if (multipleQuery) filterSql += " and"
    else filterSql += " where"
    filterSql += ` "FK_channelId"='${filter.channelId}'`
    multipleQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "styleType")) {
    if (multipleQuery) filterSql += " and"
    else filterSql += " where"
    filterSql += ` "styleType"='${filter.styleType}'`
    multipleQuery = true
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
      if (multipleQuery) filterSql += " and"
      else filterSql += " where"
      filterSql += ` id in (${postIdSql})`
      multipleQuery = true
    } catch (e) {
      throw new Error("[Error] Failed to fetch postId with itemId")
    }
  }

  return filterSql
}
