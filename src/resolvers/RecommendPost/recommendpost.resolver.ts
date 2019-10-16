import { GraphQLResolveInfo } from "graphql"
import { QueryResult } from "pg"

import * as ArgType from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { QueryArgInfo } from "./type/ArgType"
import { MutationArgInfo } from "./type/ArgType"
import { GetMetaData, SequentialPromiseValue, RunSingleSQL, UploadImage } from "../Utils/promiseUtil"
import { GetFormatSql, MakeMultipleQuery } from "../Utils/stringUtil"
import { InsertItemForRecommendPost } from "../Item/util"
import { InsertItemReview, InsertItemReviewImage, GetReviewsByPostList } from "../Review/util"
import { performance } from "perf_hooks"
import { GetRecommendPostList } from "./util"

module.exports = {
  Query: {
    allRecommendPosts: async (parent: void, args: QueryArgInfo, ctx: any, info: GraphQLResolveInfo): Promise<ReturnType.RecommendPostInfo[]> => {
      let arg: ArgType.RecommendPostQuery = args.recommendPostOption
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
        WITH post AS ( SELECT * FROM "RECOMMEND_POST" ${filterSql}) 
        SELECT 
          post.*, user.name, user."profileImgUrl",
          (SELECT COUNT(*) AS "commentCount" FROM "RECOMMEND_POST_COMMENT" rec_comment WHERE rec_comment."FK_postId"=post.id),
          (SELECT COUNT(*) AS "pickCount" FROM "RECOMMEND_POST_FOLLOWER" follow WHERE follow."FK_postId"=post.id)
        FROM "USER_INFO" AS user 
        INNER JOIN post ON post."FK_accountId" = user."FK_accountId" ${formatSql}
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

      try {
        let formatSql = GetFormatSql(arg)
        let postSql = `
          WITH post_id as (
            SELECT "FK_postId" FROM "RECOMMEND_POST_FOLLOWER" WHERE "FK_accountId"=${arg.userId}
          )
          SELECT post.*,user_info.name,user_info."profileImgUrl",
            (SELECT COUNT(*) AS "commentCount" FROM "RECOMMEND_POST_COMMENT" rec_comment WHERE rec_comment."FK_postId"=post_id."FK_postId"),
            (SELECT COUNT(*) AS "pickCount" FROM "RECOMMEND_POST_FOLLOWER" follow WHERE follow."FK_postId"=post_id."FK_postId")
          FROM "RECOMMEND_POST" as post
          INNER JOIN post_id on post.id = post_id."FK_postId"  
          INNER JOIN "USER_INFO" user_info ON user_info."FK_accountId" = post."FK_accountId"
          ${formatSql}`
        let postResult = await GetRecommendPostList(postSql, info)

        return postResult
      } catch (e) {
        console.log(e)
        throw new Error("[Error] Failed to load Picked RecommendPost data from DB")
      }
    }
  },
  Mutation: {
    createRecommendPost: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
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
        let ReviewResult = await SequentialPromiseValue(arg.reviews, InsertItemReview, [recommendPostId])
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
