import { GraphQLResolveInfo } from "graphql"
import { FetchItemsForReview } from "../Item/util"
import { FetchUserForReview } from "../User/util"
import { ExtractFieldFromList, ExtractSelectionSet, GetSubField, RunSingleSQL, SequentialPromiseValue } from "../Utils/promiseUtil"
import { ConvertListToOrderedPair, GetFormatSql } from "../Utils/stringUtil"
import { QueryArgInfo, ReviewQuery } from "./type/ArgType"
import { ItemReviewInfo } from "./type/ReturnType"
import { ReviewMatchGraphQL } from "./util"
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
          }
          //Filter from DB
          else {
            filterSql = GetReviewFilterSql(arg)
            if (arg.filterGeneral.sortBy == "userId") arg.filterGeneral.sortBy = "FK_accountId"
            formatSql = GetFormatSql(arg, "", "review")
            overrideSql = OverrideReviewSql(arg)
          }
        }

        let reviewSql = `
          SELECT review.* FROM "ITEM_REVIEW" review
          INNER JOIN "RECOMMEND_POST" post ON post.id = review."FK_postId"
          ${filterSql} ${formatSql}
        `

        if (overrideSql != "") reviewSql = overrideSql + filterSql + formatSql
        let queryResult = await RunSingleSQL(reviewSql)
        //Query Item Info
        let selectionSet = ExtractSelectionSet(info.fieldNodes[0])
        selectionSet = selectionSet.flat(2)
        if (selectionSet.includes("itemInfo")) {
          await SequentialPromiseValue(queryResult, FetchItemsForReview)
        }
        //Query User Info
        if (selectionSet.includes("userInfo")) {
          await SequentialPromiseValue(queryResult, FetchUserForReview)
        }
        //Query Images and set as a property
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
        //refine reviews to match graphQL schema
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
    //takes care of increasing purchaseCount, detailPageClickCount etc (all counts related to review)
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
  let isMultiple = false
  let filterSql: string = ""
  if (Object.prototype.hasOwnProperty.call(filter.reviewFilter, "reviewId")) {
    if (!isMultiple) filterSql += " WHERE "
    else filterSql += " AND "
    filterSql += ` review.id=${filter.reviewFilter.reviewId}`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(filter.reviewFilter, "itemId")) {
    if (!isMultiple) filterSql += " WHERE "
    else filterSql += " AND "
    filterSql += ` review."FK_itemId"=${filter.reviewFilter.itemId}`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(filter.reviewFilter, "postId")) {
    if (!isMultiple) filterSql += " WHERE "
    else filterSql += " AND "
    filterSql += ` review."FK_postId"=${filter.reviewFilter.postId}`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(filter.reviewFilter, "postType")) {
    if (!isMultiple) filterSql += " WHERE "
    else filterSql += " AND "
    filterSql += ` post."postType"='${filter.reviewFilter.postType}'`
    isMultiple = true
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
