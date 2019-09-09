const { pool } = require("../database/connectionPool")
import { SequentialPromiseValue } from "./Util"
import { GraphQLResolveInfo, SelectionNode } from "graphql"
import * as ArgType from "./type/ArgType"
import { QueryArgInfo } from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { QueryResult, Pool, PoolClient } from "pg"
import { performance } from "perf_hooks"
import { BoardType } from "./type/enum"

module.exports = {
  allItems: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<ReturnType.ItemInfo[]> => {
    let arg: ArgType.ItemQuery = args.itemOption
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    let sortSql: string
    sortSql = " ORDER BY " + arg.sortBy + " " + arg.filterCommon.sort
    let limitSql: string
    limitSql = " LIMIT " + arg.filterCommon.first + " OFFSET " + arg.filterCommon.start

    try {
      let filterSql: string = ""
      if (Object.prototype.hasOwnProperty.call(arg, "itemFilter")) {
        filterSql = GetItemFilterSql(arg.itemFilter)
      }

      console.log('SELECT * FROM "ITEM"' + filterSql + sortSql + limitSql)
      let queryResult = await client.query('SELECT * FROM "ITEM"' + filterSql + sortSql + limitSql)
      client.release()
      let itemResult: ReturnType.ItemInfo[] = queryResult.rows

      itemResult.forEach(item => {})

      return itemResult
    } catch (e) {
      client.release()
      console.log(e)
      throw new Error("[Error] Failed to fetch data from DB")
    }
  },

  _allItemsMetadata: async (parent: void, args: QueryArgInfo): Promise<number> => {
    return GetMetaData("ITEM")
  },

  allCommunityPosts: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<ReturnType.CommunityPostInfo[]> => {
    let arg: ArgType.CommunityPostQuery = args.communityPostOption
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    try {
      let filterSql: string = ""
      if (Object.prototype.hasOwnProperty.call(arg, "postFilter")) {
        if (Object.prototype.hasOwnProperty.call(arg.postFilter, "accountId")) filterSql = ` where "FK_accountId"=${arg.postFilter.accountId}`
        else if (Object.prototype.hasOwnProperty.call(arg.postFilter, "postId")) filterSql = ` where id=${arg.postFilter.postId}`
      }

      let sortSql = " ORDER BY " + arg.sortBy + " " + arg.filterCommon.sort
      let limitSql = " LIMIT " + arg.filterCommon.first + " OFFSET " + arg.filterCommon.start

      let queryResult = await client.query('SELECT * FROM "COMMUNITY_POST"' + filterSql + sortSql + limitSql)

      let PromiseResult: any = await Promise.all([
        SequentialPromiseValue(queryResult.rows, GetCommunityPostImage),
        SequentialPromiseValue(queryResult.rows, GetUserInfo)
      ])
      let imgResult: ReturnType.ImageInfo[][] = PromiseResult[0]
      let userResult: ReturnType.UserInfo[] = PromiseResult[1]
      let postResult: ReturnType.CommunityPostInfo[] = queryResult.rows

      postResult.forEach((post: ReturnType.CommunityPostInfo, index: number) => {
        post.accountId = post.FK_accountId
        post.channelId = post.FK_channelId
        post.name = userResult[index].name
        post.profileImgUrl = userResult[index].profileImgUrl
        post.imageUrl = new Array()
        imgResult[index].forEach(image => {
          post.imageUrl.push(image.imageUrl)
        })
      })

      return postResult
    } catch (e) {
      console.log(e)
      throw new Error("[Error] Failed to fetch community post from DB")
    }
  },

  _allCommunityPostsMetadata: async (parent: void, args: QueryArgInfo): Promise<number> => {
    return GetMetaData("COMMUNITY_POST")
  },

  allRecommendPosts: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<ReturnType.RecommendPostInfo[]> => {
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
        filterSql = GetRecommendPostFilterSql(arg.postFilter)
      }

      let sortSql = " ORDER BY " + arg.sortBy + " " + arg.filterCommon.sort
      let limitSql = " LIMIT " + arg.filterCommon.first + " OFFSET " + arg.filterCommon.start

      let postSql = 'SELECT * FROM "RECOMMEND_POST"' + filterSql + sortSql + limitSql
      queryResult = await client.query(postSql)
      let postResult: ReturnType.RecommendPostInfo[] = queryResult.rows
      if (postResult.length == 0) {
        client.release()
        return []
      }
      postResult.forEach(async (post: ReturnType.RecommendPostInfo) => {
        post.accountId = post.FK_accountId
        post.reviews = []
        queryResult = await client.query(`SELECT COUNT(*) FROM "RECOMMEND_POST_FOLLOWER" where "FK_postId"=${post.id}`)
        post.pickCount = queryResult.rows[0].count
      })

      let extractRequest: string[] = []
      if (info.fieldNodes[0].selectionSet !== undefined) {
        let requestedDataArray = info.fieldNodes[0].selectionSet.selections
        extractRequest = SearchSelectionSet(requestedDataArray)
      }
      //CHECK IF QUERY FOR REVIEW IS NEEDED
      if (extractRequest.includes("reviews")) {
        let reviewSql = `WITH aaa AS (${postSql}) SELECT bbb.*, rank() OVER (PARTITION BY bbb."FK_postId") FROM "ITEM_REVIEW" AS bbb INNER JOIN aaa ON aaa.id = bbb."FK_postId"`
        queryResult = await client.query(reviewSql)
        let reviewResult: ReturnType.ItemReviewInfo[] = queryResult.rows
        if (reviewResult.length == 0) {
          client.release()
          return postResult
        }
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
        if (arg.filterCommon.sort == "ASC") i = 0
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
          if (arg.filterCommon.sort == "ASC") {
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
          let cardSql = `WITH aaa AS (${reviewSql}) SELECT bbb.*, rank() OVER (PARTITION BY bbb."FK_reviewId") FROM "ITEM_REVIEW_CARD" AS bbb INNER JOIN aaa ON aaa.id = bbb."FK_reviewId"`
          queryResult = await client.query(cardSql)
          let cardResult: ReturnType.ItemReviewCardInfo[] = queryResult.rows
          if (cardResult.length == 0) {
            client.release()
            return postResult
          }
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

      client.release()
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

  getComments: async (parent: void, args: QueryArgInfo): Promise<ReturnType.CommentInfo[]> => {
    let arg: ArgType.CommentQuery = args.commentOption
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      console.log(e)
      throw new Error("[Error] Failed Connecting to DB")
    }

    try {
      let boardName = GetBoardName(arg.boardType)
      let queryResult = await client.query(`SELECT * FROM "${boardName}_COMMENT" where "FK_postId"=${arg.postId}`)
      client.release()
      let commentResults: ReturnType.CommentInfo[] = queryResult.rows
      commentResults.forEach(comment => {
        comment.postId = comment.FK_postId
        comment.accountId = comment.FK_accountId
      })

      return commentResults
    } catch (e) {
      client.release()
      console.log(e)
      throw new Error("[Error] Failed to fetch comments")
    }
  },

  getUserInfo: async (parent: void, args: QueryArgInfo): Promise<[ReturnType.UserInfo]> => {
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

function GetBoardName(name: BoardType): string {
  let boardName = ""
  if (String(name) == "COMMUNITY") boardName = "COMMUNITY_POST"
  else if (String(name) == "RECOMMEND") boardName = "RECOMMEND_POST"

  return boardName
}

function GetRecommendPostFilterSql(filter: ArgType.PostQueryFilter): string {
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

  if (Object.prototype.hasOwnProperty.call(filter, "styleType")) {
    if (multipleQuery) filterSql += " and"
    else filterSql += " where"
    filterSql += ` "styleType"='${filter.styleType}'`
    multipleQuery = true
  }

  console.log(filterSql)
  return filterSql
}

function GetItemFilterSql(filter: ArgType.ItemQueryFilter): string {
  let multipleQuery: Boolean = false
  let filterSql: string = ""

  if (Object.prototype.hasOwnProperty.call(filter, "itemMajorType")) {
    filterSql = ` where "itemMajorType"='${filter.itemMajorType}'`
    multipleQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "itemMinorType")) {
    if (multipleQuery) filterSql += " and"
    else filterSql += " where"
    filterSql += ` "itemMinorType"='${filter.itemMinorType}'`
    multipleQuery = true
  }
  console.log(filterSql)
  return filterSql
}
