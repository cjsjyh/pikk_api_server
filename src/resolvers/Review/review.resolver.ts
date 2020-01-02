import { GraphQLResolveInfo } from "graphql"
import { QueryArgInfo, MutationArgInfo, ReviewQuery } from "./type/ArgType"
import { ItemReviewInfo } from "./type/ReturnType"
import { ExtractSelectionSet, GetSubField, ExtractFieldFromList } from "../Utils/promiseUtil"
import { RunSingleSQL, SequentialPromiseValue } from "../Utils/promiseUtil"
import { GetFormatSql, ConvertListToOrderedPair } from "../Utils/stringUtil"
import { ReviewMatchGraphQL } from "./util"
import { FetchItemsForReview } from "../Item/util"
import { FetchUserForReview } from "../User/util"
var logger = require("../../tools/logger")
var elastic = require("../../database/elasticConnect")

module.exports = {
  Query: {
    allItemReviews: async (
      parent: void,
      args: QueryArgInfo,
      ctx: void,
      info: GraphQLResolveInfo
    ): Promise<ItemReviewInfo[]> => {
      //Query Review Info
      let arg: ReviewQuery = args.reviewOption
      try {
        let filterSql = ""
        let formatSql = ""
        let overrideSql = ""

        if (Object.prototype.hasOwnProperty.call(arg, "reviewFilter")) {
          //Find communityPost by search
          if (Object.prototype.hasOwnProperty.call(arg.reviewFilter, "searchText")) {
            let sqlResult = await GetSearchSql(arg)
            if (!sqlResult) return []

            filterSql = sqlResult.filterSql
            formatSql = sqlResult.formatSql
          } else {
            filterSql = GetReviewFilterSql(arg)
            formatSql = GetFormatSql(arg)
            overrideSql = OverrideReviewSql(arg)
          }
        }

        let reviewSql = `SELECT * FROM "ITEM_REVIEW" review ${filterSql} ${formatSql}`
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
          let imgResult = await GetSubField(
            queryResult,
            "ITEM_REVIEW_IMAGE",
            "FK_reviewId",
            "images",
            1,
            "",
            `ORDER BY "order" ASC`
          )
          imgResult.forEach(imgGroup => {
            imgGroup.forEach(img => {
              img.reviewId = img.FK_reviewId
            })
          })
        }
        queryResult.forEach(review => {
          ReviewMatchGraphQL(review)
        })
        logger.info(`allItemReviews Called!`)

        return queryResult
      } catch (e) {
        logger.warn("Failed to query allItemReviews")
        logger.error(e.stack)
        throw new Error("[Error] Failed to query allItemReviews")
      }
    },

    _allItemReviewsMetadata: async (
      parent: void,
      args: QueryArgInfo,
      ctx: void,
      info: GraphQLResolveInfo
    ): Promise<number> => {
      //Query Review Info
      let arg: ReviewQuery = args.reviewOption
      try {
        let filterSql = ""
        let formatSql = ""
        let overrideSql = ""

        if (Object.prototype.hasOwnProperty.call(arg, "reviewFilter")) {
          //Find communityPost by search
          if (Object.prototype.hasOwnProperty.call(arg.reviewFilter, "searchText")) {
            let sqlResult = await GetSearchSql(arg)
            if (!sqlResult) return 0
            return sqlResult.hitCount
          } else {
            filterSql = GetReviewFilterSql(arg)
            formatSql = GetFormatSql(arg)
            overrideSql = OverrideReviewSql(arg)
          }
        }

        let reviewSql = `SELECT * FROM "ITEM_REVIEW" ${filterSql}`
        if (overrideSql != "") reviewSql = overrideSql + filterSql
        let countSql = `
          WITH review AS (
            ${reviewSql}
          )
          SELECT COUNT(*) FROM review
        `
        let queryResult = await RunSingleSQL(countSql)

        logger.info(`allItemReviews Called!`)
        return queryResult[0].count
      } catch (e) {
        logger.warn("Failed to query allItemReviews")
        logger.error(e.stack)
        throw new Error("[Error] Failed to query allItemReviews")
      }
    }
  },

  Mutation: {
    increaseReviewCount: async (parent: void, args: QueryArgInfo): Promise<Boolean> => {
      try {
        let query = `UPDATE "ITEM_REVIEW" SET "${args.increaseOption.type}" = "${args.increaseOption.type}" + 1 WHERE id = ${args.increaseOption.id}`
        let result = await RunSingleSQL(query)
        logger.info(`IncreaseReviewCount Called`)
        return true
      } catch (e) {
        logger.warn(
          `Failed to increase REVIEW COUNT for ${args.increaseOption.type} ${args.increaseOption.id}`
        )
        logger.error(e.stack)
        throw new Error(
          `Failed to increase REVIEW COUNT for ${args.increaseOption.type} ${args.increaseOption.id}`
        )
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

async function GetSearchSql(arg: ReviewQuery): Promise<any> {
  let indexName: string = ""
  let filterSql: string = ""
  let selectionSql: string = ""
  let formatSql: string = ""
  let hitCount: number = 0
  if (process.env.MODE == "DEPLOY") indexName = "recpost"
  else indexName = "recpost_test"

  let start: number = 0
  let first: number = 10
  if (arg.filterGeneral) {
    start = arg.filterGeneral.start
    first = arg.filterGeneral.first
  }

  let result = await elastic.SearchElasticSearch(
    elastic.elasticClient,
    indexName,
    arg.reviewFilter.searchText,
    start,
    first,
    "best_fields",
    ["review^2", "shortreview^2", "name^3", "content"]
  )
  let extractedPostIds = ExtractFieldFromList(result.hits, "_id")
  if (extractedPostIds.length == 0) return null
  filterSql = `
    JOIN (
      VALUES
      ${ConvertListToOrderedPair(extractedPostIds)}
    ) AS x (id,ordering) ON review.id = x.id
  `

  hitCount = result.total.value
  selectionSql = `x.ordering, `
  formatSql = `ORDER BY x.ordering ASC`

  return {
    filterSql,
    selectionSql,
    formatSql,
    hitCount
  }
}
