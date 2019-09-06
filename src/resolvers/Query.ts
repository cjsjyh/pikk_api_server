const { pool } = require("../database/connectionPool")
import { SequentialPromiseValue } from "./Util"
import { GraphQLResolveInfo, SelectionNode } from "graphql"
import * as ArgType from "./type/ArgType"
import { QueryArgInfo } from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { QueryResult } from "pg"
import { performance } from "perf_hooks"

module.exports = {
  allItems: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<[ReturnType.ItemInfo]> => {
    let arg: ArgType.ItemQuery = args.itemOption
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    let sortSql: string
    sortSql = " ORDER BY " + arg.sortBy + " " + arg.filter.sort
    let limitSql: string
    limitSql = " LIMIT " + arg.filter.first + " OFFSET " + arg.filter.start

    try {
      let queryResult = await client.query('SELECT * FROM "ITEM"' + sortSql + limitSql)
      client.release()
      return queryResult.rows
    } catch (e) {
      client.release()
      console.log(e)
      throw new Error("[Error] Failed to fetch data from DB")
    }
  },

  _allItemsMetadata: async (parent: void, args: QueryArgInfo): Promise<number> => {
    return GetMetaData("ITEM")
  },

  allCommunityPosts: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<[ReturnType.CommunityPostInfo]> => {
    let arg: ArgType.CommunityPostQuery = args.communityPostOption
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    let sortSql = " ORDER BY " + arg.sortBy + " " + arg.filter.sort
    let limitSql = " LIMIT " + arg.filter.first + " OFFSET " + arg.filter.start

    let postResult, imgResult: QueryResult
    try {
      postResult = await client.query('SELECT * FROM "COMMUNITY_POST"' + sortSql + limitSql)

      let PromiseResult: any = await Promise.all([
        SequentialPromiseValue(postResult.rows, GetCommunityPostImage),
        SequentialPromiseValue(postResult.rows, GetUserInfo)
      ])
      let imgResult: ReturnType.ImageInfo[][] = PromiseResult[0]
      let userResult: ReturnType.UserInfo[] = PromiseResult[1]

      postResult.rows.forEach((item: ReturnType.CommunityPostInfo, index: number) => {
        item.accountId = item.FK_accountId
        item.channelId = item.FK_channelId
        item.name = userResult[index].name
        item.profileImgUrl = userResult[index].profileImgUrl
        item.imageUrl = new Array()
        imgResult[index].forEach(image => {
          item.imageUrl.push(image.imageUrl)
        })
      })

      return postResult.rows
    } catch (e) {
      throw new Error("[Error] Failed to fetch user data from DB")
    }
  },

  _allCommunityPostsMetadata: async (parent: void, args: QueryArgInfo): Promise<number> => {
    return GetMetaData("COMMUNITY_POST")
  },

  allRecommendPosts: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<[ReturnType.RecommendPostInfo]> => {
    var t0 = performance.now()

    let arg: ArgType.RecommendPostQuery = args.recommendPostOption
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      console.log(e)
      throw new Error("[Error] Failed Connecting to DB")
    }

    let sortSql = " ORDER BY " + arg.sortBy + " " + arg.filter.sort
    let limitSql = " LIMIT " + arg.filter.first + " OFFSET " + arg.filter.start

    let extractRequest: string[] = []
    if (info.fieldNodes[0].selectionSet !== undefined) {
      let requestedDataArray = info.fieldNodes[0].selectionSet.selections
      extractRequest = SearchSelectionSet(requestedDataArray)
      console.log(extractRequest)
    }

    let postResult, reviewResult, cardResult
    try {
      let postSql = 'SELECT * FROM "RECOMMEND_POST"' + sortSql + limitSql
      postResult = await client.query(postSql)
      postResult = postResult.rows
      postResult.forEach((post: ReturnType.RecommendPostInfo) => {
        post.accountId = post.FK_accountId
        post.reviews = []
      })

      //CHECK IF QUERY FOR REVIEW IS NEEDED
      if (extractRequest.includes("reviews")) {
        console.log("Querying for reviews")
        let reviewSql = `WITH aaa AS (${postSql}) SELECT bbb.*, rank() OVER (PARTITION BY bbb."FK_postId") FROM "ITEM_REVIEW" AS bbb INNER JOIN aaa ON aaa.id = bbb."FK_postId"`
        reviewResult = await client.query(reviewSql)
        reviewResult = reviewResult.rows
        reviewResult.forEach((review: ReturnType.ItemReviewInfo) => {
          review.itemId = review.FK_itemId
          review.postId = review.FK_postId
          review.cards = []
        })

        let reviewArray: ReturnType.ItemReviewInfo[][] = [[]]
        let currentId = -1
        reviewResult.forEach((review: ReturnType.ItemReviewInfo) => {
          if (review.postId != currentId) {
            if (currentId != -1) reviewArray.push([])
            currentId = review.postId
          }
          reviewArray[reviewArray.length - 1].push(review)
        })

        //Add review to Post
        let i
        if (arg.filter.sort == "ASC") i = 0
        else i = reviewArray.length - 1

        let j = 0
        while (true) {
          for (; j < postResult.length; j++) {
            if (reviewArray[i][0].postId == postResult[j].id) {
              postResult[j].reviews = reviewArray[i]
              j++
              break
            }
          }
          if (arg.filter.sort == "ASC") {
            ++i
            if (i >= reviewResult.length) break
          } else {
            --i
            if (i < 0) break
          }
        }

        //CHECK IF QUERY FOR CARD IS NEEDED
        let cardFlag = false
        let reviewIndex = extractRequest.indexOf("reviews")
        if (Array.isArray(extractRequest[reviewIndex + 1])) if (extractRequest[reviewIndex + 1].includes("cards")) cardFlag = true

        if (cardFlag) {
          console.log("Querying for cards")
          let cardSql = `WITH aaa AS (${reviewSql}) SELECT bbb.*, rank() OVER (PARTITION BY bbb."FK_reviewId") FROM "ITEM_REVIEW_CARD" AS bbb INNER JOIN aaa ON aaa.id = bbb."FK_reviewId"`
          cardResult = await client.query(cardSql)
          cardResult = cardResult.rows
          cardResult.forEach((card: ReturnType.ItemReviewCardInfo) => {
            card.reviewId = card.FK_reviewId
          })

          let cardArray: ReturnType.ItemReviewCardInfo[][] = [[]]
          currentId = -1
          cardResult.forEach((card: ReturnType.ItemReviewCardInfo) => {
            if (card.reviewId != currentId) {
              if (currentId != -1) cardArray.push([])
              currentId = card.reviewId
            }
            cardArray[cardArray.length - 1].push(card)
          })

          //Add card to review
          j = 0
          for (let i = 0; i < cardArray.length; i++) {
            for (; j < reviewResult.length; j++) {
              if (cardArray[i][0].reviewId == reviewResult[j].id) {
                reviewResult[j].cards = cardArray[i]
                j++
                break
              }
            }
          }
        }
      }

      var t1 = performance.now()
      console.log("Time Elapsed: " + (t1 - t0) + "milliseconds")
      client.release()
      return postResult
    } catch (e) {
      console.log(e)
      client.release()
      throw new Error("[Error] Failed to fetch user data from DB")
    }
  },

  _allRecommendPostsMetadata: async (parent: void, args: QueryArgInfo): Promise<number> => {
    return GetMetaData("RECOMMEND_POST")
  },

  getUser: async (parent: void, args: QueryArgInfo): Promise<[ReturnType.UserInfo]> => {
    let arg: ArgType.UserQuery = args.userOption
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    try {
      let queryResult = await client.query('SELECT * FROM "USER_INFO" WHERE "FK_accountId"=' + arg.id)
      client.release()

      console.log(queryResult.rows)
      return queryResult.rows
    } catch (e) {
      client.release()
      console.log(e)
      throw new Error("[Error] Failed to fetch data from DB")
    }
  }
}

function GetUserInfo(postInfo: any): Promise<ReturnType.UserInfo> {
  return new Promise(async (resolve, reject) => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    try {
      let queryResult = await client.query('SELECT * FROM "USER_INFO" where "FK_accountId"=$1', [postInfo.FK_accountId])
      client.release()
      resolve(queryResult.rows[0])
    } catch (e) {
      client.release()
      reject(e)
    }
  })
}

function GetCommunityPostImage(postInfo: ReturnType.CommunityPostInfo): Promise<QueryResult> {
  return new Promise(async (resolve, reject) => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    try {
      let queryResult = await client.query('SELECT "imageUrl" FROM "COMMUNITY_POST_IMAGE" where "FK_postId"=$1', [postInfo.id])
      client.release()
      console.log(queryResult.rows)
      resolve(queryResult.rows)
    } catch (e) {
      client.release()
      reject(e)
    }
  })
}

async function GetMetaData(tableName: string): Promise<number> {
  let client
  try {
    client = await pool.connect()
  } catch (e) {
    throw new Error("[Error] Failed Connecting to DB")
  }

  let countResult = await client.query(`SELECT COUNT(*) FROM "${tableName}"`)
  return countResult.rows[0].count
}

function SearchSelectionSet(selectionset: readonly SelectionNode[]): any {
  let result: string[] = []
  selectionset.forEach((element: any) => {
    result.push(element.name.value)
    if (element.selectionSet !== undefined) {
      result.push(SearchSelectionSet(element.selectionSet.selections))
    }
  })
  return result
}
