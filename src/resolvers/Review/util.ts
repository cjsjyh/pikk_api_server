const { pool } = require("../../database/connectionPool")
const { S3 } = require("../../database/aws_s3")
const _ = require("lodash")

import * as RecPostReturnType from "../RecommendPost/type/ReturnType"
import * as ReviewArgType from "./type/ArgType"
import * as ReviewReturnType from "./type/ReturnType"
import { ExtractSelectionSet, getFormatDate, getFormatHour, UploadImage, RunSingleSQL } from "../Util/util"

import { GraphQLResolveInfo } from "graphql"
import { PoolClient, QueryResult } from "pg"

export async function GetReviewsAndImage(postResult: any, info: GraphQLResolveInfo, postSql: string) {
  try {
    let queryResult: QueryResult
    await Promise.all(
      postResult.map(async (post: RecPostReturnType.RecommendPostInfo) => {
        post.accountId = post.FK_accountId
        post.reviews = []
        queryResult = await RunSingleSQL(`SELECT COUNT(*) FROM "RECOMMEND_POST_FOLLOWER" where "FK_postId"=${post.id}`)
        post.pickCount = queryResult[0].count
      })
    )

    let selectionSet: string[] = ExtractSelectionSet(info.fieldNodes[0])

    //CHECK IF QUERY FOR REVIEW IS NEEDED
    if (selectionSet.includes("reviews")) {
      let reviewSql = `WITH aaa AS (${postSql}) SELECT bbb.*, rank() OVER (PARTITION BY bbb."FK_postId") FROM "ITEM_REVIEW" AS bbb INNER JOIN aaa ON aaa.id = bbb."FK_postId"`
      queryResult = await RunSingleSQL(reviewSql)
      let reviewResult: any = queryResult
      if (reviewResult.length == 0) {
        return postResult
      }
      reviewResult.forEach((review: ReviewReturnType.ItemReviewInfo) => {
        review.itemId = review.FK_itemId
        review.postId = review.FK_postId
        review.imgs = []
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

      //CHECK IF QUERY FOR Image IS NEEDED
      let imgFlag = false
      let reviewIndex = selectionSet.indexOf("reviews")
      if (Array.isArray(selectionSet[reviewIndex + 1])) if (selectionSet[reviewIndex + 1].includes("imgs")) imgFlag = true

      if (imgFlag) {
        let imgSql = `WITH aaa AS (${reviewSql}) SELECT bbb.*, rank() OVER (PARTITION BY bbb."FK_reviewId") FROM "ITEM_REVIEW_IMAGE" AS bbb INNER JOIN aaa ON aaa.id = bbb."FK_reviewId"`
        queryResult = await RunSingleSQL(imgSql)

        let imgResult: any = queryResult
        if (imgResult.length == 0) {
          return postResult
        }
        imgResult.forEach((img: ReviewReturnType.ItemReviewImgInfo) => {
          img.reviewId = img.FK_reviewId
        })

        let imgArray: ReviewReturnType.ItemReviewImgInfo[][] = [[]]
        currentId = -1
        imgResult.forEach((img: ReviewReturnType.ItemReviewImgInfo) => {
          if (img.reviewId != currentId) {
            if (currentId != -1) imgArray.push([])
            currentId = img.reviewId
          }
          imgArray[imgArray.length - 1].push(img)
        })

        //Add Image to review
        let groupedImgs = _.groupBy(imgArray, "FK_reviewId").undefined
        groupedImgs.forEach(img => {
          reviewArray.forEach(reviewsByPost => {
            reviewsByPost.forEach(review => {
              if (review.id == img[0].FK_reviewId) review.imgs = img
            })
          })
        })
      }
    }
  } catch (e) {
    console.log(e)
    throw new Error("[Error] Failed to fetch user data from DB")
  }
}

export function InsertItemReview(itemReview: ReviewArgType.ItemReviewInfoInput, args: Array<number>): Promise<{}> {
  return new Promise(async (resolve, reject) => {
    try {
      let postId = args[0]
      let insertResult = await RunSingleSQL(
        `INSERT INTO "ITEM_REVIEW"
        ("FK_itemId","FK_postId","recommendReason","review","score") 
        VALUES (${itemReview.itemId}, ${postId}, '${itemReview.recommendReason}', '${itemReview.review}', ${itemReview.score}) RETURNING id`
      )
      let reviewId = insertResult[0].id
      console.log(`Inserted ReviewID: ${reviewId} for PostID: ${postId}`)
      resolve(reviewId)
    } catch (e) {
      console.log(e)
      reject(e)
    }
  })
}

export function InsertItemReviewImage(arg: ReviewArgType.ItemReviewImgInfoInput, reviewId: number): Promise<{}> {
  return new Promise(async (resolve, reject) => {
    let imageUrl = null
    if (Object.prototype.hasOwnProperty.call(arg, "img")) {
      imageUrl = await UploadImage(arg.img)
      if (imageUrl == null) {
        throw new Error("[Error] Image Upload Failed!")
      }
    }

    try {
      let imgId = await RunSingleSQL(`
      INSERT INTO "ITEM_REVIEW_IMAGE"("FK_reviewId","imgUrl") 
      VALUES (${reviewId},'${imageUrl}') RETURNING id`)
      console.log(`Inserted ImageId: ${imgId[0].id} for ReviewId: ${reviewId}`)
      resolve(imgId[0].id)
    } catch (e) {
      console.log("[Error] Failed to Insert into ITEM_REVIEW_IMAGE")
      console.log(e)
      reject()
    }
  })
}

export function ReviewMatchGraphQL(obj: any) {
  obj.itemId = obj.FK_itemId
  obj.postId = obj.FK_postId
}
