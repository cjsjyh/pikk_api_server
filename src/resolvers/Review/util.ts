import * as ReviewArgType from "./type/ArgType"
import {
  ExtractSelectionSet,
  UploadImage,
  RunSingleSQL,
  ExtractFieldFromList,
  SequentialPromiseValue,
  MakeGroups,
  AssignGroupsToParent,
  UploadImageWrapper
} from "../Utils/promiseUtil"
import { ConvertListToString, ConvertListToOrderedPair } from "../Utils/stringUtil"
import { GraphQLResolveInfo } from "graphql"
import { FetchItemsForReview } from "../Item/util"
import { FetchUserForReview } from "../User/util"
import { IncrementViewCountFunc } from "../Common/util"

export async function GetReviewsByPostList(postResult: any, info: GraphQLResolveInfo) {
  try {
    let selectionSet: string[] = ExtractSelectionSet(info.fieldNodes[0])
    //CHECK IF QUERY FOR REVIEW IS NEEDED
    if (selectionSet.includes("reviews")) {
      await Promise.all(
        postResult.map(async post => {
          return IncrementViewCountFunc("RECOMMEND", post.id)
        })
      )
      let reviewResult = await GetSubField(postResult, "ITEM_REVIEW", "FK_postId", "reviews", 1, "", "ORDER BY id ASC")
      reviewResult.forEach(review => {
        ReviewMatchGraphQL(review)
        review.imgs = []
      })
      if (IsSubFieldRequired(selectionSet, "reviews", "imgs")) {
        let imgResult = await GetSubField(reviewResult, "ITEM_REVIEW_IMAGE", "FK_reviewId", "imgs", 2, "")
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
  customSql: string = "",
  formatSql: string = ""
): Promise<any[]> {
  let parentIdList = ExtractFieldFromList(parentList, "id", depth)
  if (parentIdList.length == 0) return []

  let querySql = `
  SELECT 
    subfield.* 
  FROM "${tableName}" AS subfield 
  WHERE subfield."${filterBy}" IN (${ConvertListToString(parentIdList)}) ${formatSql}`

  console.log(querySql)

  let queryResult
  if (customSql == "") queryResult = await RunSingleSQL(querySql)
  else queryResult = await RunSingleSQL(customSql)

  if (queryResult.length == 0) {
    return queryResult
  }
  //Grouping Reviews
  let groupedSubfield = MakeGroups(queryResult, filterBy, parentIdList)
  console.log("MakeGroups done")
  //Add Review Group to Post
  AssignGroupsToParent(parentList, groupedSubfield, filterBy, assignTo, depth)
  console.log("assign to parent done")

  return groupedSubfield
}

export function InsertItemReview(itemReview: ReviewArgType.ItemReviewInfoInput, args: Array<number>): Promise<{}> {
  return new Promise(async (resolve, reject) => {
    try {
      let postId = args[0]
      let insertResult = await RunSingleSQL(
        `INSERT INTO "ITEM_REVIEW"
        ("FK_itemId","FK_postId","recommendReason","review","shortReview","score") 
        VALUES (${itemReview.itemId}, ${postId}, '${itemReview.recommendReason}', '${itemReview.review}','${itemReview.shortReview}' ,${itemReview.score}) RETURNING id`
      )
      let reviewId = insertResult[0].id
      if (!Object.prototype.hasOwnProperty.call(itemReview, "imgs")) {
        console.log("No Images Inserted!")
        resolve(reviewId)
      } else {
        console.log("Image Inserted!")
        let imgUrlList
        try {
          imgUrlList = await SequentialPromiseValue(itemReview.imgs, UploadImageWrapper)
        } catch (e) {
          console.log("Failed to upload Images")
          console.log(e)
        }

        try {
          let imgPairs = ConvertListToOrderedPair(imgUrlList, `,${String(reviewId)}`, false)
          await RunSingleSQL(
            `INSERT INTO "ITEM_REVIEW_IMAGE" ("imgUrl","order","FK_reviewId") 
        VALUES ${imgPairs}
        `
          )
        } catch (e) {
          console.log("Failed to Insert into ITEM_REVIEW_IMAGE")
          console.log(e)
        }

        console.log(`Inserted ReviewID: ${reviewId} for PostID: ${postId}`)
        resolve(reviewId)
      }
    } catch (e) {
      console.log(e)
      reject(e)
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
