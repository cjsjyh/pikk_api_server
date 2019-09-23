import * as AWS from "aws-sdk"
const { pool } = require("../../database/connectionPool")
const { S3 } = require("../../database/aws_s3")

import { GraphQLResolveInfo } from "graphql"
import { PoolClient, QueryResult } from "pg"

import * as ArgType from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { QueryArgInfo } from "./type/ArgType"
import { MutationArgInfo } from "./type/ArgType"
import { GetMetaData, SequentialPromiseValue, getFormatDate, getFormatHour, RunSingleSQL } from "../util/Util"
import { InsertItem } from "../Item/util"
import { GetReviewsAndCards, InsertItemReview, InsertItemReviewCard } from "../Review/util"

module.exports = {
  Query: {
    allRecommendPosts: async (parent: void, args: QueryArgInfo, ctx: any, info: GraphQLResolveInfo): Promise<ReturnType.RecommendPostInfo[]> => {
      let arg: ArgType.RecommendPostQuery = args.recommendPostOption
      let client: PoolClient
      try {
        client = await pool.connect()
      } catch (e) {
        console.log(e)
        throw new Error("[Error] Failed Connecting to DB")
      }

      let queryResult: QueryResult
      try {
        let filterSql: string = ""
        if (Object.prototype.hasOwnProperty.call(arg, "postFilter")) {
          filterSql = await GetPostFilterSql(arg.postFilter)
          if (filterSql == null) {
            client.release()
            return []
          }
        }

        let sortSql = " ORDER BY " + arg.sortBy + " " + arg.filterCommon.sort
        let limitSql = " LIMIT " + arg.filterCommon.first + " OFFSET " + arg.filterCommon.start
        let postSql =
          'WITH aaa AS ( SELECT * FROM "RECOMMEND_POST"' +
          filterSql +
          sortSql +
          limitSql +
          ') SELECT aaa.*,bbb.name,bbb."profileImgUrl" FROM "USER_INFO" AS bbb INNER JOIN aaa ON aaa."FK_accountId" = bbb."FK_accountId"'
        queryResult = await client.query(postSql)
        client.release()

        let postResult: ReturnType.RecommendPostInfo[] = queryResult.rows
        if (postResult.length == 0) {
          return []
        }

        await GetReviewsAndCards(postResult, info, postSql)
        return postResult
      } catch (e) {
        client.release()
        console.log(e)
        throw new Error("[Error] Failed to fetch user data from DB")
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
      let client: PoolClient
      try {
        client = await pool.connect()
      } catch (e) {
        console.log(e)
        throw new Error("[Error] Failed Connecting to DB")
      }

      let queryResult: QueryResult
      try {
        let limitSql = " LIMIT " + arg.filterCommon.first + " OFFSET " + arg.filterCommon.start
        let postSql =
          `WITH bbb as (SELECT "FK_postId" FROM "RECOMMEND_POST_FOLLOWER" WHERE "FK_accountId"=${arg.userId}) 
      SELECT aaa.* from "RECOMMEND_POST" as aaa 
      INNER JOIN bbb on aaa.id = bbb."FK_postId"` + limitSql
        queryResult = await client.query(postSql)
        client.release()

        let postResult: ReturnType.RecommendPostInfo[] = queryResult.rows
        if (postResult.length == 0) {
          return []
        }

        await GetReviewsAndCards(postResult, info, postSql)
        return postResult
      } catch (e) {
        client.release()
        console.log(e)
        throw new Error("[Error] Failed to fetch user data from DB")
      }
    }
  },
  Mutation: {
    createRecommendPost: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      if (!ctx.IsVerified) throw new Error("USER NOT LOGGED IN!")
      let arg: ArgType.RecommendPostInfoInput = args.recommendPostInfo
      let client
      try {
        client = await pool.connect()
      } catch (e) {
        console.log("[Error] Failed Connecting to DB")
        return false
      }
      let imageUrl = null
      if (arg.titleType == "IMAGE") {
        if (!Object.prototype.hasOwnProperty.call(arg, "titleImg")) {
          client.release()
          throw new Error("[Error] title type IMAGE but no image sent!")
        }
        //Upload Image and retrieve URL
        const { createReadStream, filename, mimetype, encoding } = await arg.titleImg

        let date = getFormatDate(new Date())
        let hour = getFormatHour(new Date())

        var param = {
          Bucket: "fashiondogam-images",
          Key: "image/" + date + hour + filename,
          ACL: "public-read",
          Body: createReadStream(),
          ContentType: mimetype
        }

        await new Promise((resolve, reject) => {
          S3.upload(param, function(err: Error, data: AWS.S3.ManagedUpload.SendData) {
            if (err) {
              console.log(err)
              reject(err)
            }
            console.log(data)
            imageUrl = data.Location
            resolve()
          })
        })
      }

      let recommendPostId: number
      try {
        let insertResult = await client.query(
          'INSERT INTO "RECOMMEND_POST"("FK_accountId","title","content","postType","styleType","titleType","titleYoutubeUrl","titleImageUrl") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
          [arg.accountId, arg.title, arg.content, arg.postType, arg.styleType, arg.titleType, arg.titleYoutubeUrl, imageUrl]
        )
        client.release()
        recommendPostId = insertResult.rows[0].id
      } catch (e) {
        client.release()
        console.log("[Error] Failed to Insert into RECOMMEND_POST")
        console.log(e)
        return false
      }

      try {
        let ItemResult = await SequentialPromiseValue(arg.reviews, InsertItem)
        let ReviewResult = await SequentialPromiseValue(arg.reviews, InsertItemReview, [recommendPostId])
        await Promise.all(
          arg.reviews.map((review, index) => {
            return Promise.all(
              review.cards.map(card => {
                return InsertItemReviewCard(card, ReviewResult[index])
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
  if (Object.prototype.hasOwnProperty.call(filter, "filterCommon")) {
    if (Object.prototype.hasOwnProperty.call(filter.filterCommon, "accountId")) {
      filterSql = ` where "FK_accountId"=${filter.filterCommon.accountId}`
      multipleQuery = true
    } else if (Object.prototype.hasOwnProperty.call(filter.filterCommon, "postId")) {
      filterSql = ` where id=${filter.filterCommon.postId}`
      multipleQuery = true
    }
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
    let client: PoolClient
    try {
      client = await pool.connect()
    } catch (e) {
      console.log(e)
      throw new Error("[Error] Failed Connecting to DB")
    }
    try {
      let { rows } = await client.query(`SELECT "FK_postId" FROM "ITEM_REVIEW" WHERE "FK_itemId"=${filter.itemId}`)
      client.release()
      if (rows.length == 0) return null

      let postIdSql = ""
      rows.forEach((row, index) => {
        if (index != 0) postIdSql += ","
        postIdSql += row.FK_postId
      })
      if (multipleQuery) filterSql += " and"
      else filterSql += " where"
      filterSql += ` id in (${postIdSql})`
      multipleQuery = true
    } catch (e) {
      client.release()
      throw new Error("[Error] Failed to fetch postId with itemId")
    }
  }

  return filterSql
}
