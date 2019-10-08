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
import { ExtractSelectionSet } from "../Util/util"
import { RunSingleSQL, GetFormatSql } from "../Util/util"
import {} from "./util"
import { strict } from "assert"

module.exports = {
  Query: {
    allItemReviews: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<Boolean> => {
      //Query Review Info
      let arg: ReviewQuery = args.reviewOption
      let filterSql = GetReviewFilterSql(arg)
      let formatSql = GetFormatSql(arg)
      let queryResult = await RunSingleSQL('SELECT * FROM "ITEM_REVIEW" ' + filterSql + formatSql)

      //Query Item Info
      let selectionSet = ExtractSelectionSet(info.fieldNodes[0])
      console.log(selectionSet)
      if (selectionSet.flat(2).includes("itemInfo")) {
      }

      return true
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
    filterSql = `WHERE "FK_itemId"=${filter.reviewFilter.reviewId}`
  }

  return filterSql
}
