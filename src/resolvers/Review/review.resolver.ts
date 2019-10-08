/*
import * as AWS from "aws-sdk"
const { pool } = require("../../database/connectionPool")
const { S3 } = require("../../database/aws_s3")
import * as ArgType from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { MutationArgInfo } from "./type/ArgType"


*/
import { GraphQLResolveInfo } from "graphql"
import { QueryArgInfo, ReviewQuery } from "./type/ArgType"
import * as ReviewReturnType from "./type/ReturnType"
import * as ItemReturnType from "../Item/type/ReturnType"
import { ExtractSelectionSet } from "../Util/util"
import { RunSingleSQL, GetFormatSql, SequentialPromiseValue } from "../Util/util"
import { ReviewMatchGraphQL } from "./util"
import { strict } from "assert"
import { GetSingleItem, FetchItemsForReview } from "../Item/util"

module.exports = {
  Query: {
    allItemReviews: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<ItemReturnType.ItemInfo[]> => {
      //Query Review Info
      let arg: ReviewQuery = args.reviewOption
      let filterSql = GetReviewFilterSql(arg)
      let formatSql = GetFormatSql(arg)
      let reviewSql = 'SELECT * FROM "ITEM_REVIEW" ' + filterSql + formatSql
      //Query Item Info
      let selectionSet = ExtractSelectionSet(info.fieldNodes[0])
      let queryResult = await RunSingleSQL(reviewSql)
      if (selectionSet.flat(2).includes("itemInfo")) {
        await SequentialPromiseValue(queryResult, FetchItemsForReview)
      }
      queryResult.forEach(review => {
        ReviewMatchGraphQL(review)
      })
      return queryResult
    }
  },

  Mutation: {}
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
