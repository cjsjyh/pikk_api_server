const { pool } = require("../../database/connectionPool")
const { S3 } = require("../../database/aws_s3")
const _ = require("lodash")

import * as RecPostReturnType from "../RecommendPost/type/ReturnType"
import * as ReviewArgType from "./type/ArgType"
import * as ReviewReturnType from "./type/ReturnType"
import { SearchSelectionSet, getFormatDate, getFormatHour, UploadImage } from "../util/Util"

import { GraphQLResolveInfo } from "graphql"
import { PoolClient, QueryResult } from "pg"

export async function GetReviewsAndCards(postResult: any, info: GraphQLResolveInfo, postSql: string) {
  let client: PoolClient
  try {
    client = await pool.connect()
  } catch (e) {
    console.log(e)
    throw new Error("[Error] Failed Connecting to DB")
  }

  try {
    let queryResult: QueryResult
    await Promise.all(
      postResult.map(async (post: RecPostReturnType.RecommendPostInfo) => {
        post.accountId = post.FK_accountId
        post.reviews = []
        queryResult = await client.query(`SELECT COUNT(*) FROM "RECOMMEND_POST_FOLLOWER" where "FK_postId"=${post.id}`)
        post.pickCount = queryResult.rows[0].count
      })
    )

    let extractRequest: string[] = []
    if (info.fieldNodes[0].selectionSet !== undefined) {
      let requestedDataArray = info.fieldNodes[0].selectionSet.selections
      extractRequest = SearchSelectionSet(requestedDataArray)
    }
    //CHECK IF QUERY FOR REVIEW IS NEEDED
    if (extractRequest.includes("reviews")) {
      let reviewSql = `WITH aaa AS (${postSql}) SELECT bbb.*, rank() OVER (PARTITION BY bbb."FK_postId") FROM "ITEM_REVIEW" AS bbb INNER JOIN aaa ON aaa.id = bbb."FK_postId"`
      queryResult = await client.query(reviewSql)
      let reviewResult: ReviewReturnType.ItemReviewInfo[] = queryResult.rows
      if (reviewResult.length == 0) {
        client.release()
        return postResult
      }
      reviewResult.forEach((review: ReviewReturnType.ItemReviewInfo) => {
        review.itemId = review.FK_itemId
        review.postId = review.FK_postId
        review.cards = []
      })

      let reviewArray: ReviewReturnType.ItemReviewInfo[][] = [[]]
      let currentId = -1
      reviewResult.forEach((review: ReviewReturnType.ItemReviewInfo) => {
        if (review.postId != currentId) {
          if (currentId != -1) reviewArray.push([])
          currentId = review.postId
        }
        reviewArray[reviewArray.length - 1].push(review)
      })

      //Add review to Post
      let groupedReviews = _.groupBy(reviewArray, "FK_postId").undefined
      groupedReviews.forEach(review => {
        postResult.forEach(post => {
          if (post.id == review[0].FK_postId) post.reviews = review
        })
      })

      //CHECK IF QUERY FOR CARD IS NEEDED
      let cardFlag = false
      let reviewIndex = extractRequest.indexOf("reviews")
      if (Array.isArray(extractRequest[reviewIndex + 1])) if (extractRequest[reviewIndex + 1].includes("cards")) cardFlag = true

      if (cardFlag) {
        let cardSql = `WITH aaa AS (${reviewSql}) SELECT bbb.*, rank() OVER (PARTITION BY bbb."FK_reviewId") FROM "ITEM_REVIEW_CARD" AS bbb INNER JOIN aaa ON aaa.id = bbb."FK_reviewId"`
        queryResult = await client.query(cardSql)
        client.release()

        let cardResult: ReviewReturnType.ItemReviewCardInfo[] = queryResult.rows
        if (cardResult.length == 0) {
          return postResult
        }
        cardResult.forEach((card: ReviewReturnType.ItemReviewCardInfo) => {
          card.reviewId = card.FK_reviewId
        })

        let cardArray: ReviewReturnType.ItemReviewCardInfo[][] = [[]]
        currentId = -1
        cardResult.forEach((card: ReviewReturnType.ItemReviewCardInfo) => {
          if (card.reviewId != currentId) {
            if (currentId != -1) cardArray.push([])
            currentId = card.reviewId
          }
          cardArray[cardArray.length - 1].push(card)
        })

        //Add card to review
        let groupedCards = _.groupBy(cardArray, "FK_reviewId").undefined
        groupedCards.forEach(card => {
          reviewArray.forEach(reviewsByPost => {
            reviewsByPost.forEach(review => {
              if (review.id == card[0].FK_reviewId) review.cards = card
            })
          })
        })
      }
    }
  } catch (e) {
    client.release()
    console.log(e)
    throw new Error("[Error] Failed to fetch user data from DB")
  }
}

export function InsertItemReview(itemReview: ReviewArgType.ItemReviewInfoInput, args: Array<number>): Promise<{}> {
  return new Promise(async (resolve, reject) => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      reject(e)
    }

    try {
      let imageUrl = null
      if (Object.prototype.hasOwnProperty.call(itemReview, "img")) {
        //Upload Image and retrieve URL
        imageUrl = await UploadImage(itemReview.img)
        if (imageUrl == null) {
          client.release()
          throw new Error("[Error] Image Upload Failed!")
        }
      }

      let postId = args[0]
      let insertResult = await client.query(
        'INSERT INTO "ITEM_REVIEW"("FK_itemId","FK_postId","recommendReason","shortReview","score", "imgUrl") VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
        [itemReview.itemId, postId, itemReview.recommendReason, itemReview.shortReview, itemReview.score, imageUrl]
      )
      client.release()
      let reviewId = insertResult.rows[0].id
      console.log(`Inserted ReviewID: ${reviewId} for PostID: ${postId}`)
      resolve(reviewId)
    } catch (e) {
      client.release()
      console.log(e)
      reject(e)
    }
  })
}

export function InsertItemReviewCard(arg: ReviewArgType.ItemReviewCardInfoInput, reviewId: number): Promise<{}> {
  return new Promise(async (resolve, reject) => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      console.log("[Error] Failed Connecting to DB")
      return false
    }
    let imageUrl = null
    if (Object.prototype.hasOwnProperty.call(arg, "img")) {
      imageUrl = await UploadImage(arg.img)
      if (imageUrl == null) {
        client.release()
        throw new Error("[Error] Image Upload Failed!")
      }
    }

    try {
      let cardId = await client.query('INSERT INTO "ITEM_REVIEW_CARD"("FK_reviewId","title","content","imgUrl") VALUES ($1,$2,$3,$4) RETURNING id', [
        reviewId,
        arg.title,
        arg.content,
        imageUrl
      ])
      client.release()
      console.log(`Inserted CardId: ${cardId.rows[0].id} for ReviewId: ${reviewId}`)
      resolve(cardId.rows[0].id)
    } catch (e) {
      client.release()
      console.log("[Error] Failed to Insert into ITEM_REVIEW_CARD")
      console.log(e)
      reject()
    }
  })
}
