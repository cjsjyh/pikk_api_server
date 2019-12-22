import * as AWS from "aws-sdk"
const { pool } = require("../../database/connectionPool")
const { S3 } = require("../../database/aws_s3")

import * as ArgType from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { QueryArgInfo } from "./type/ArgType"
import { MutationArgInfo } from "./type/ArgType"
import { GetMetaData, RunSingleSQL, ExtractFieldFromList } from "../Utils/promiseUtil"
import {
  GetFormatSql,
  MakeMultipleQuery,
  ConvertListToOrderedPair,
  MakeCacheNameByObject
} from "../Utils/stringUtil"

import { GraphQLResolveInfo } from "graphql"
import { InsertItem, GetItemsById, GetItemIdInRanking, CombineItem } from "./util"
import { GetRedis, SetRedis } from "../../database/redisConnect"
import { performance } from "perf_hooks"
import { FindAndCombineDuplicateItem } from "./util"
import { VerifyJWT } from "../Utils/securityUtil"

var logger = require("../../tools/logger")

module.exports = {
  Query: {
    // allItems: async (
    //   parent: void,
    //   args: QueryArgInfo,
    //   ctx: void,
    //   info: GraphQLResolveInfo
    // ): Promise<ReturnType.ItemInfo[]> => {
    //   let arg: ArgType.ItemQuery = args.itemOption
    //   try {
    //     let formatSql = GetFormatSql(arg)
    //     let idList = []
    //     let filterSql: string = ""
    //     if (Object.prototype.hasOwnProperty.call(arg, "itemFilter")) {
    //       filterSql = GetItemFilterSql(arg.itemFilter)
    //     }
    //     let itemResult = await GetItemsById(idList, formatSql, filterSql)
    //     logger.info(`AllItemsCalled`)
    //     return itemResult
    //   } catch (e) {
    //     logger.warn("Failed to fetch all Items")
    //     logger.error(e.stack)
    //     throw new Error("[Error] Failed to fetch Item data from DB")
    //   }
    // },

    // _allItemsMetadata: async (parent: void, args: QueryArgInfo): Promise<number> => {
    //   let arg: ArgType.ItemMetadataFilter = args.itemMetadataOption
    //   let itemCount = await RunSingleSQL(`
    //     SELECT COUNT(*) FROM "ITEM_VARIATION" var
    //     INNER JOIN "ITEM_GROUP" item_gr ON var."FK_itemGroupId" = item_gr.id
    //     ${GetItemFilterSql(arg)}
    //   `)
    //   return itemCount[0].count
    // },

    getUserPickkItem: async (parent: void, args: QueryArgInfo): Promise<ReturnType.ItemInfo[]> => {
      let arg: ArgType.PickkItemQuery = args.pickkItemOption

      try {
        let formatSql = GetFormatSql(arg)
        let queryResult = await RunSingleSQL(
          `SELECT "FK_itemId" FROM "ITEM_FOLLOWER" WHERE "FK_accountId"=${arg.userId}`
        )
        if (queryResult.length == 0) return []
        let idList = ExtractFieldFromList(queryResult, "FK_itemId")

        let itemResult = await GetItemsById(idList, formatSql)
        logger.info(`User ${arg.userId} queried PickItem`)
        return itemResult
      } catch (e) {
        logger.warn(`Failed to fetch user pickk item for userId ${arg.userId}`)
        logger.error(e.stack)
        throw new Error(`[Error] Failed to fetch user pickk item for userId ${arg.userId}`)
      }
    },

    _getUserPickkItemMetadata: async (parent: void, args: QueryArgInfo): Promise<number> => {
      let arg: ArgType.PickkItemQuery = args.pickkItemOption
      let queryResult = await RunSingleSQL(
        `SELECT COUNT(*) FROM "ITEM_FOLLOWER" WHERE "FK_accountId"=${arg.userId}`
      )
      return queryResult[0].count
    },

    getItemRanking: async (parent: void, args: QueryArgInfo): Promise<ReturnType.ItemInfo[]> => {
      let arg: ArgType.ItemRankingFilter = args.itemRankingOption

      try {
        let cacheName = "itemRank"
        cacheName += MakeCacheNameByObject(arg)
        cacheName += MakeCacheNameByObject(arg.filterGeneral)
        let itemRankCache: any = await GetRedis(cacheName)
        if (itemRankCache != null) {
          logger.info("getItemRank Cache Return")
          return JSON.parse(itemRankCache)
        }

        let filterSql = GetItemFilterSql(arg)
        let formatSql = GetFormatSql(arg, `, review_score."itemId" DESC `)
        let rankList = await GetItemIdInRanking(
          formatSql,
          filterSql.primarySql,
          filterSql.secondarySql
        )
        let itemIdList = ExtractFieldFromList(rankList, "id")
        let customFilterSql = `
        JOIN (
          VALUES
        ${ConvertListToOrderedPair(itemIdList)}
        ) AS x (id,ordering) ON item_var.id = x.id
      `
        if (itemIdList.length == 0) return []
        let itemList = await GetItemsById(
          itemIdList,
          "ORDER BY item_full.ordering ASC",
          customFilterSql,
          "x.ordering,"
        )
        await SetRedis(cacheName, JSON.stringify(itemList), 1800)

        logger.info("ItemRanking Called")
        return itemList
      } catch (e) {
        logger.warn(`get Item Ranking failed`)
        logger.error(e.stack)
        throw new Error(`[Error] get Item Ranking failed`)
      }
    },

    _getItemRankingMetadata: async (parent: void, args: QueryArgInfo): Promise<number> => {
      let arg: ArgType.ItemRankingFilter = args.itemRankingOption
      try {
        let filterSql = GetItemFilterSql(arg)
        let itemCount = await RunSingleSQL(`
        WITH items as (
          SELECT 
            var.id,
            item_gr."itemMajorType",
                item_gr."itemMinorType",
                item_gr."itemFinalType",
                (
                  CASE WHEN var."salePrice" is null 
                  THEN item_gr."originalPrice" 
                ELSE var."salePrice" 
                END
                ) as price
          FROM "ITEM_VARIATION" var
          INNER JOIN "ITEM_GROUP" item_gr ON var."FK_itemGroupId" = item_gr.id
          ${filterSql.primarySql}
        ),
        review as (
          SELECT items.id FROM items
          INNER JOIN "ITEM_REVIEW" rev ON items.id = rev."FK_itemId"
          ${filterSql.secondarySql}
          GROUP BY items.id, items."itemMinorType",items."itemMajorType",items."itemFinalType"
        )
        SELECT COUNT(*) FROM review
      `)
        return itemCount[0].count
      } catch (e) {
        logger.warn("Failed to call _getItemRankingMetadata")
        logger.error(e.stack)
        throw new Error("Failed to call _getItemRankingMetadata")
      }
    }
  },
  Mutation: {
    createItem: async (parent: void, args: MutationArgInfo, ctx: any): Promise<boolean> => {
      if (!ctx.IsVerified) throw new Error("[Error] User not Logged In!")
      let arg: ArgType.ItemInfoInput = args.itemInfoInput

      try {
        let queryResult = await InsertItem(arg)
        logger.info(`createItem Success! itemId: ${queryResult}`)
        return true
      } catch (e) {
        logger.warn(`Failed to create Item`)
        logger.error(e.stack)
        throw new Error("[Error] Failed to create Item!")
      }
    },

    autoMergeItem: async (parent: void, args: MutationArgInfo, ctx: any): Promise<string> => {
      try {
        let combinationLog = await FindAndCombineDuplicateItem()
        logger.info(combinationLog)
        return combinationLog
      } catch (e) {
        logger.error(e.stack)
        throw new Error(e)
      }
    },

    selfMergeItem: async (parent: void, args: MutationArgInfo, ctx: any): Promise<boolean> => {
      let arg = args.selfMerge
      try {
        if (!VerifyJWT(arg.token, arg.accountId)) throw new Error("User not allowed!")
        let headId = await RunSingleSQL(
          `SELECT "FK_itemId" FROM "ITEM_REVIEW" WHERE id=${arg.headId}`
        )
        let tailId = await RunSingleSQL(
          `SELECT "FK_itemId" FROM "ITEM_REVIEW" WHERE id=${arg.tailId}`
        )
        await CombineItem(headId[0].FK_itemId, [tailId[0].FK_itemId])
        return true
      } catch (e) {
        logger.error(e.stack)
        throw new Error(e)
      }
    }
  }
}

function GetItemFilterSql(filter: any): any {
  let multiplePrimaryQuery: boolean = false
  let multipleSecondaryQuery: boolean = false
  let primarySql: string = ""
  let secondarySql: string = ""

  if (Object.prototype.hasOwnProperty.call(filter, "itemMajorType")) {
    if (filter.itemMajorType != "ALL") {
      primarySql = ` where item_gr."itemMajorType"='${filter.itemMajorType}'`
      multiplePrimaryQuery = true
    }
  }
  if (Object.prototype.hasOwnProperty.call(filter, "itemMinorType")) {
    if (filter.itemMinorType != "ALL") {
      primarySql = MakeMultipleQuery(
        multiplePrimaryQuery,
        primarySql,
        ` item_gr."itemMinorType"='${filter.itemMinorType}'`
      )
      multiplePrimaryQuery = true
    }
  }
  if (Object.prototype.hasOwnProperty.call(filter, "itemFinalType")) {
    if (filter.itemFinalType != "ALL") {
      primarySql = MakeMultipleQuery(
        multiplePrimaryQuery,
        primarySql,
        ` item_gr."itemFinalType"='${filter.itemFinalType}'`
      )
      multiplePrimaryQuery = true
    }
  }
  if (Object.prototype.hasOwnProperty.call(filter, "itemId")) {
    primarySql = MakeMultipleQuery(
      multiplePrimaryQuery,
      primarySql,
      ` item_var.id=${filter.itemId}`
    )
    multiplePrimaryQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "minimumPrice")) {
    secondarySql = MakeMultipleQuery(
      multipleSecondaryQuery,
      secondarySql,
      ` "items".price > ${filter.minimumPrice}`
    )
    multipleSecondaryQuery = true
  }
  if (Object.prototype.hasOwnProperty.call(filter, "maximumPrice")) {
    secondarySql = MakeMultipleQuery(
      multipleSecondaryQuery,
      secondarySql,
      ` "items".price < ${filter.maximumPrice}`
    )
    multipleSecondaryQuery = true
  }

  return {
    primarySql,
    secondarySql
  }
}
