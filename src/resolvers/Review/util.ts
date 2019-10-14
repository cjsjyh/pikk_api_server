import * as ReviewArgType from "./type/ArgType"
import {
  ExtractSelectionSet,
  UploadImage,
  RunSingleSQL,
  ConvertListToString,
  ExtractFieldFromList,
  SequentialPromiseValue,
  MakeGroups,
  AssignGroupsToParent
} from "../Utils/util"

import { GraphQLResolveInfo } from "graphql"
import { FetchItemsForReview } from "../Item/util"
import { FetchUserForReview } from "../User/util"

export async function GetReviewsByPostList(postResult: any, info: GraphQLResolveInfo) {
  try {
    let selectionSet: string[] = ExtractSelectionSet(info.fieldNodes[0])
    //CHECK IF QUERY FOR REVIEW IS NEEDED
    if (selectionSet.includes("reviews")) {
      let reviewResult = await GetSubField(postResult, "ITEM_REVIEW", "FK_postId", "reviews")
      reviewResult.forEach(review => {
        ReviewMatchGraphQL(review)
        review.imgs = []
      })
      if (IsSubFieldRequired(selectionSet, "reviews", "imgs")) {
        let imgResult = await GetSubField(reviewResult, "ITEM_REVIEW_IMAGE", "FK_reviewId", "imgs", 2)
        imgResult.forEach(img => (img.reviewId = img.FK_reviewId))
      }

      if (IsSubFieldRequired(selectionSet, "reviews", "userInfo")) {
        await Promise.all(
          reviewResult.map(reviewSet => {
            return SequentialPromiseValue(reviewSet, FetchUserForReview)
          })
        )
      }

      if (IsSubFieldRequired(selectionSet, "reviews", "itemInfo")) {
        await Promise.all(
          reviewResult.map(reviewSet => {
            return SequentialPromiseValue(reviewSet, FetchItemsForReview)
          })
        )
      }
    }
  } catch (e) {
    console.log(e)
    throw new Error("[Error] Failed to fetch review by post list from DB")
  }
}

export async function GetSubField(
  parentList: any,
  tableName: string,
  filterBy: string,
  assignTo: string,
  depth: number = 1,
  customSql?: string
): Promise<any[]> {
  let parentIdList = ExtractFieldFromList(parentList, "id", depth)
  let querySql = `
  SELECT 
    subfield.*, 
    rank() OVER (PARTITION BY subfield."${filterBy}") 
  FROM "${tableName}" AS subfield 
  WHERE subfield."${filterBy}" IN (${ConvertListToString(parentIdList)})`
  let queryResult
  if (customSql == null) queryResult = await RunSingleSQL(querySql)
  else queryResult = await RunSingleSQL(customSql)

  if (queryResult.length == 0) {
    return queryResult
  }
  //Grouping Reviews
  let groupedSubfield = MakeGroups(queryResult, filterBy)
  //Add Review Group to Post
  AssignGroupsToParent(parentList, groupedSubfield, filterBy, assignTo)
  return groupedSubfield
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

function IsSubFieldRequired(selectionSet: any, fieldName: string, subfieldName: string): boolean {
  let fieldIndex = selectionSet.indexOf(fieldName)
  if (Array.isArray(selectionSet[fieldIndex + 1])) {
    if (selectionSet[fieldIndex + 1].includes(subfieldName)) return true
    else return false
  }
}

export function GetReviewForSinglePost(post: any) {
  return new Promise(async (resolve, reject) => {
    try {
      let reviewResult = await RunSingleSQL(`
        SELECT * FROM "ITEM_REVIEW" WHERE "FK_postId"=${post.id}
      `)

      reviewResult.forEach(review => {
        ReviewMatchGraphQL(review)
        review.imgs = []
      })

      post.reviews = reviewResult
      resolve()
    } catch (e) {
      reject()
    }
  })
}

export function GetImagesForSingleReview(review: any) {
  return new Promise(async (resolve, reject) => {
    try {
      let imgsResult = await RunSingleSQL(`
        SELECT * FROM "ITEM_REVIEW_IMAGE" WHERE "FK_reviewId"=${review.id}
      `)
      imgsResult.forEach(img => (img.reviewId = img.FK_reviewId))
      review.imgs = imgsResult
      resolve()
    } catch (e) {
      reject()
    }
  })
}

/*
    if (selectionSet.includes("reviews")) {
      let postIdList = ExtractFieldFromList(postResult, "id")
      let reviewSql = `
      SELECT 
        review.*, 
        rank() OVER (PARTITION BY review."FK_postId") 
      FROM "ITEM_REVIEW" AS review 
      WHERE review."FK_postId" IN (${ConvertListToString(postIdList)})`

      queryResult = await RunSingleSQL(reviewSql)
      let reviewResult: any = queryResult
      if (reviewResult.length == 0) {
        return postResult
      }

      reviewResult.forEach(review => {
        ReviewMatchGraphQL(review)
        review.imgs = []
      })
      //Grouping Reviews
      let reviewArray: ReviewReturnType.ItemReviewInfo[][] = MakeGroups(reviewResult, "postId")
      //Add Review Group to Post
      AssignGroupsToParent(postResult, reviewArray, "FK_postId", "reviews")

      //CHECK IF QUERY FOR Image IS NEEDED
      let imgFlag = false
      let itemFlag = false
      let reviewIndex = selectionSet.indexOf("reviews")
      if (Array.isArray(selectionSet[reviewIndex + 1])) if (selectionSet[reviewIndex + 1].includes("imgs")) imgFlag = true
      if (Array.isArray(selectionSet[reviewIndex + 1])) if (selectionSet[reviewIndex + 1].includes("itemInfo")) itemFlag = true

      if (imgFlag) {
        let reviewIdList = ExtractFieldFromList(reviewResult, "id")
        let imgSql = `
        SELECT 
          img.*, 
          rank() OVER (PARTITION BY imgs."FK_reviewId") 
        FROM "ITEM_REVIEW_IMAGE" AS imgs 
        WHERE imgs."FK_reviewId" IN (${ConvertListToString(reviewIdList)})`
        queryResult = await RunSingleSQL(imgSql)

        let imgResult: any = queryResult
        if (imgResult.length == 0) {
          return postResult
        }
        imgResult.forEach(img => (img.reviewId = img.FK_reviewId))
        //Grouping Images
        let imgArray: ReviewReturnType.ItemReviewImgInfo[][] = MakeGroups(imgResult, "reviewId")
        AssignGroupsToParent(reviewResult, imgArray, "FK_reviewId", "imgs")
      }
    }
    */
