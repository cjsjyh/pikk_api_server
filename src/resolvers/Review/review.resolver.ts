import { GraphQLResolveInfo } from "graphql"
import { QueryArgInfo, MutationArgInfo, ReviewQuery } from "./type/ArgType"
import * as ArgType from "./type/ArgType"
import { ItemReviewInfo } from "./type/ReturnType"
import { ExtractSelectionSet } from "../Utils/promiseUtil"
import { RunSingleSQL, SequentialPromiseValue } from "../Utils/promiseUtil"
import { GetFormatSql, logWithDate } from "../Utils/stringUtil"
import { ReviewMatchGraphQL, GetSubField } from "./util"
import { FetchItemsForReview } from "../Item/util"
import { FetchUserForReview } from "../User/util"
import { ValidateUser } from "../Utils/securityUtil"

module.exports = {
  Query: {
    allItemReviews: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<ItemReviewInfo[]> => {
      //Query Review Info
      let arg: ReviewQuery = args.reviewOption
      try {
        let filterSql = GetReviewFilterSql(arg)
        let formatSql = GetFormatSql(arg)
        let reviewSql = `SELECT * FROM "ITEM_REVIEW" ${filterSql} ${formatSql}`
        let overrideSql = OverrideReviewSql(arg)
        if (overrideSql != "") reviewSql = overrideSql + filterSql + formatSql
        let queryResult = await RunSingleSQL(reviewSql)
        //Query Item Info
        let selectionSet = ExtractSelectionSet(info.fieldNodes[0])
        selectionSet = selectionSet.flat(2)
        if (selectionSet.includes("itemInfo")) {
          await SequentialPromiseValue(queryResult, FetchItemsForReview)
        }
        if (selectionSet.includes("userInfo")) {
          await SequentialPromiseValue(queryResult, FetchUserForReview)
        }
        if (selectionSet.includes("images")) {
          let imgResult = await GetSubField(queryResult, "ITEM_REVIEW_IMAGE", "FK_reviewId", "images", 1, "", `ORDER BY "order" ASC`)
          imgResult.forEach(img => (img.reviewId = img.FK_reviewId))
        }
        queryResult.forEach(review => {
          ReviewMatchGraphQL(review)
        })
        logWithDate(`allItemReviews Called!`)
        return queryResult
      } catch (e) {
        logWithDate("[Error] Failed to query allItemReviews")
        logWithDate(e)
        throw new Error("[Error] Failed to query allItemReviews")
      }
    }
  },

  Mutation: {
    increaseReviewCount: async (parent: void, args: QueryArgInfo): Promise<Boolean> => {
      try {
        let query = `UPDATE "ITEM_REVIEW" SET "${args.increaseOption.type}" = "${args.increaseOption.type}" + 1 WHERE id = ${args.increaseOption.id}`
        let result = await RunSingleSQL(query)
        logWithDate(`IncreaseReviewCount Called`)
        return true
      } catch (e) {
        logWithDate(`[Error] Failed to increase REVIEW COUNT for ${args.increaseOption.type} ${args.increaseOption.id}`)
        logWithDate(e)
        return false
      }
    }
  }
}

function GetReviewFilterSql(filter: ReviewQuery): string {
  let filterSql: string = ""
  if (Object.prototype.hasOwnProperty.call(filter.reviewFilter, "reviewId")) {
    filterSql = `WHERE id=${filter.reviewFilter.reviewId}`
  }

  if (Object.prototype.hasOwnProperty.call(filter.reviewFilter, "itemId")) {
    filterSql = `WHERE "FK_itemId"=${filter.reviewFilter.itemId}`
  }

  return filterSql
}

function OverrideReviewSql(filter: ReviewQuery): string {
  let overrideSql = ""
  if (Object.prototype.hasOwnProperty.call(filter, "filterGeneral")) {
    if (filter.filterGeneral.sortBy == "userId")
      overrideSql = `SELECT review.*, post."FK_accountId" as "userId" 
      FROM "ITEM_REVIEW" review 
      INNER JOIN "RECOMMEND_POST" post 
      ON review."FK_postId" = post.id
      `
  }

  if (Object.prototype.hasOwnProperty.call(filter.reviewFilter, "userId")) {
    overrideSql = `
    WITH post_id AS 
    (
      SELECT post.id 
      FROM "RECOMMEND_POST" post 
      WHERE post."FK_accountId" = ${filter.reviewFilter.userId}
    )
    SELECT review.* 
    FROM "ITEM_REVIEW" review, post_id 
    WHERE review."FK_postId" = post_id.id
    `
  }

  return overrideSql
}
