import * as ReviewArgType from "./type/ArgType"
import {
  ExtractSelectionSet,
  RunSingleSQL,
  ExtractFieldFromList,
  SequentialPromiseValue,
  MakeGroups,
  AssignGroupsToParent
} from "../Utils/promiseUtil"
import { ConvertListToString, ConvertListToOrderedPair, logWithDate } from "../Utils/stringUtil"
import { GraphQLResolveInfo } from "graphql"
import { FetchItemsForReview, EditItem, InsertItemForRecommendPost } from "../Item/util"
import { FetchUserForReview } from "../User/util"
import { IncrementViewCountFunc, InsertImageIntoTable, EditImageUrlInTable } from "../Common/util"

export async function EditReview(
  review: ReviewArgType.ItemReviewEditInfoInput,
  args: any
): Promise<boolean> {
  try {
    //Editing Review
    if (Object.prototype.hasOwnProperty.call(review, "reviewId") && review.reviewId != null) {
      let setSql = GetEditSql(review)
      await RunSingleSQL(`
        UPDATE "ITEM_REVIEW" SET
        ${setSql}
        WHERE "id"=${review.reviewId}
      `)

      if (Object.prototype.hasOwnProperty.call(review, "images")) {
        await Promise.all(
          review.images.map((image, index) => {
            return EditImageUrlInTable(
              image,
              "ITEM_REVIEW_IMAGE",
              "FK_reviewId",
              review.reviewId,
              index
            )
          })
        )
      }

      if (Object.prototype.hasOwnProperty.call(review, "item")) {
        await EditItem(review.item)
      }
    }
    //Creating New Review
    else {
      await InsertItemForRecommendPost(review)
      await InsertItemReview(review, args)
    }
    return true
  } catch (e) {
    logWithDate(`[Error] Failed to edit Review`)
    throw new Error(e)
  }
}

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
      let reviewResult = await GetSubField(
        postResult,
        "ITEM_REVIEW",
        "FK_postId",
        "reviews",
        1,
        "",
        "ORDER BY id ASC"
      )
      reviewResult.forEach(review => {
        ReviewMatchGraphQL(review)
        review.images = []
      })
      if (IsSubFieldRequired(selectionSet, "reviews", "images")) {
        let imgResult = await GetSubField(
          reviewResult,
          "ITEM_REVIEW_IMAGE",
          "FK_reviewId",
          "images",
          2,
          ""
        )
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
    logWithDate(e)
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

  let queryResult
  if (customSql == "") queryResult = await RunSingleSQL(querySql)
  else queryResult = await RunSingleSQL(customSql)

  if (queryResult.length == 0) {
    return queryResult
  }

  //Grouping Reviews
  let groupedSubfield = MakeGroups(queryResult, filterBy, parentIdList)
  //Add Review Group to Post
  AssignGroupsToParent(parentList, groupedSubfield, filterBy, assignTo, depth)

  return groupedSubfield
}

export function InsertItemReview(
  itemReview: ReviewArgType.ItemReviewInfoInput | ReviewArgType.ItemReviewEditInfoInput,
  args: Array<number>
): Promise<{}> {
  return new Promise(async (resolve, reject) => {
    try {
      let postId = args[0]
      let accountId = args[1]
      let order = args[2]
      let insertResult = await RunSingleSQL(
        `INSERT INTO "ITEM_REVIEW"
        ("FK_accountId","FK_itemId","FK_postId","recommendReason","review","shortReview","score","order") 
        VALUES (${accountId}, ${itemReview.itemId}, ${postId}, '${itemReview.recommendReason}', '${itemReview.review}','${itemReview.shortReview}' ,${itemReview.score},${order}) RETURNING id`
      )
      let reviewId = insertResult[0].id
      if (!Object.prototype.hasOwnProperty.call(itemReview, "images")) {
        logWithDate("No Images Inserted!")
        resolve(reviewId)
      } else {
        logWithDate("Image Inserted!")
        let imgUrlList
        try {
          imgUrlList = ExtractFieldFromList(itemReview.images, "imageUrl")
        } catch (e) {
          logWithDate("Failed to upload Images")
          logWithDate(e)
        }

        try {
          let imgPairs = ConvertListToOrderedPair(imgUrlList, `,${String(reviewId)}`, false)
          await InsertImageIntoTable(imgPairs, "ITEM_REVIEW_IMAGE", "FK_reviewId")
        } catch (e) {
          logWithDate("Failed to Insert into ITEM_REVIEW_IMAGE")
          logWithDate(e)
        }

        logWithDate(`Inserted ReviewID: ${reviewId} for PostID: ${postId}`)
        resolve(reviewId)
      }
    } catch (e) {
      logWithDate(e)
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
        SELECT * FROM "ITEM_REVIEW" WHERE "FK_postId"=${post.id} ORDER BY "order" ASC
      `)

      reviewResult.forEach(review => {
        ReviewMatchGraphQL(review)
        review.images = []
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
        SELECT * FROM "ITEM_REVIEW_IMAGE" WHERE "FK_reviewId"=${review.id} ORDER BY "order" ASC
      `)
      imgsResult.forEach(img => (img.reviewId = img.FK_reviewId))
      review.images = imgsResult
      resolve()
    } catch (e) {
      reject()
    }
  })
}

function GetEditSql(filter: ReviewArgType.ItemReviewEditInfoInput): string {
  let isMultiple = false
  let resultSql = ""

  if (Object.prototype.hasOwnProperty.call(filter, "review")) {
    if (isMultiple) resultSql += ", "
    resultSql += ` "review" = '${filter.review}'`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "score")) {
    if (isMultiple) resultSql += ", "
    resultSql += ` "score"= ${filter.score}`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "recommendReason")) {
    if (isMultiple) resultSql += ", "
    resultSql += ` "recommendReason"= '${filter.recommendReason}'`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "shortReview")) {
    if (isMultiple) resultSql += ", "
    resultSql += ` "shortReview" = '${filter.shortReview}'`
    isMultiple = true
  }

  return resultSql
}
