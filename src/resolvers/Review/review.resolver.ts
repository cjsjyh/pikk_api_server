import { GraphQLResolveInfo } from "graphql"
import { QueryArgInfo, ReviewQuery } from "./type/ArgType"
import { ItemReviewInfo } from "./type/ReturnType"
import * as ItemReturnType from "../Item/type/ReturnType"
import { ExtractSelectionSet } from "../Utils/util"
import { RunSingleSQL, GetFormatSql, SequentialPromiseValue } from "../Utils/util"
import { ReviewMatchGraphQL, GetSubField } from "./util"
import { FetchItemsForReview } from "../Item/util"
import { FetchUserForReview } from "../User/util"

module.exports = {
  Query: {
    allItemReviews: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<ItemReviewInfo[]> => {
      //Query Review Info
      let arg: ReviewQuery = args.reviewOption
      let filterSql = GetReviewFilterSql(arg)
      let formatSql = GetFormatSql(arg)
      let reviewSql = 'SELECT * FROM "ITEM_REVIEW" ' + filterSql + formatSql
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
      if (selectionSet.includes("imgs")) {
        let imgResult = await GetSubField(queryResult, "ITEM_REVIEW_IMAGE", "FK_reviewId", "imgs")
        imgResult.forEach(img => (img.reviewId = img.FK_reviewId))
      }

      queryResult.forEach(review => {
        ReviewMatchGraphQL(review)
      })
      return queryResult
    }
  },

  Mutation: {
    incrementReviewCount: async (parent: void, args: QueryArgInfo): Promise<Boolean> => {
      try {
        let query = `UPDATE "ITEM_REVIEW" SET "${args.incrementOption.type}" = "${args.incrementOption.type}" + 1 WHERE id = ${args.incrementOption.id}`
        let result = await RunSingleSQL(query)
        return true
      } catch (e) {
        console.log(`[Error] Failed to increase REVIEW COUNT for ${args.incrementOption.type} ${args.incrementOption.id}`)
        console.log(e)
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
