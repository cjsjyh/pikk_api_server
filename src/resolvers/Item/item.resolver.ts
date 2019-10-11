import * as AWS from "aws-sdk"
const { pool } = require("../../database/connectionPool")
const { S3 } = require("../../database/aws_s3")

import * as ArgType from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { QueryArgInfo } from "./type/ArgType"
import { MutationArgInfo } from "./type/ArgType"
import { GetMetaData, GetFormatSql } from "../Utils/util"

import { GraphQLResolveInfo } from "graphql"
import { InsertItem, GetItems } from "./util"

module.exports = {
  Query: {
    allItems: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<ReturnType.ItemInfo[]> => {
      let arg: ArgType.ItemQuery = args.itemOption
      try {
        let formatSql = GetFormatSql(arg)
        let filterSql: string = ""
        if (Object.prototype.hasOwnProperty.call(arg, "itemFilter")) {
          filterSql = GetItemFilterSql(arg.itemFilter)
        }

        let querySql = `
        SELECT
        item_full.*,
        "BRAND"."nameKor",
        "BRAND"."nameEng"
        FROM
        (
          SELECT 
          score.*, 
          item_group."itemMinorType",  
          item_group."itemMajorType",
          item_group."originalPrice",
          item_group."FK_brandId"
          FROM 
          (
            SELECT items.*, AVG(reviews.score) as "averageScore" FROM "ITEM_VARIATION" as items
            INNER JOIN "ITEM_REVIEW" as reviews ON reviews."FK_itemId"=items.id ${filterSql}
            GROUP BY items.id
          ) as score
          INNER JOIN "ITEM_GROUP" as item_group ON score."FK_itemGroupId" = item_group.id
        ) as item_full
        INNER JOIN "BRAND" on "BRAND".id = item_full."FK_brandId"
        `
        let queryResult = await GetItems(querySql + formatSql)
        let itemResult: ReturnType.ItemInfo[] = queryResult

        return itemResult
      } catch (e) {
        console.log(e)
        throw new Error("[Error] Failed to fetch Item data from DB")
      }
    },

    _allItemsMetadata: async (parent: void, args: QueryArgInfo): Promise<number> => {
      return GetMetaData("ITEM_VARIATION")
    },

    getUserPickkItem: async (parent: void, args: QueryArgInfo): Promise<ReturnType.ItemInfo[]> => {
      let arg: ArgType.PickkItemQuery = args.pickkItemOption

      let formatSql = GetFormatSql(arg)
      let postSql = `
        WITH bbb as (SELECT "FK_itemId" FROM "ITEM_FOLLOWER" WHERE "FK_accountId"=${arg.userId})
        SELECT
        item_full.*,
        "BRAND"."nameKor",
        "BRAND"."nameEng"
        FROM
        (
          SELECT 
          score.*, 
          item_group."itemMinorType",  
          item_group."itemMajorType",
          item_group."originalPrice",
          item_group."FK_brandId"
          FROM 
          (
            SELECT items.*, AVG(reviews.score) as "averageScore" FROM bbb,"ITEM_VARIATION" as items
            INNER JOIN "ITEM_REVIEW" as reviews ON reviews."FK_itemId"=items.id WHERE items.id=bbb."FK_itemId"
            GROUP BY items.id
          ) as score
          INNER JOIN "ITEM_GROUP" as item_group ON score."FK_itemGroupId" = item_group.id
        ) as item_full
        INNER JOIN "BRAND" on "BRAND".id = item_full."FK_brandId" ${formatSql}
        `

      let queryResult = await GetItems(postSql)
      let itemResult: ReturnType.ItemInfo[] = queryResult
      return itemResult
    }
  },
  Mutation: {
    createItem: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      if (!ctx.IsVerified) throw new Error("USER NOT LOGGED IN!")
      let arg: ArgType.ItemInfoInput = args.itemInfoInput

      try {
        let queryResult = await InsertItem(arg)
        return true
      } catch (e) {
        throw new Error("[Error] Failed to create Item!")
      }
    }
  }
}

function GetItemFilterSql(filter: ArgType.ItemQueryFilter): string {
  let multipleQuery: Boolean = false
  let filterSql: string = ""

  if (Object.prototype.hasOwnProperty.call(filter, "itemMajorType")) {
    filterSql = ` where "itemMajorType"='${filter.itemMajorType}'`
    multipleQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "itemMinorType")) {
    if (multipleQuery) filterSql += " and"
    else filterSql += " where"
    filterSql += ` "itemMinorType"='${filter.itemMinorType}'`
    multipleQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "itemId")) {
    if (multipleQuery) filterSql += " and"
    else filterSql += " where"
    filterSql += ` items.id=${filter.itemId}`
    multipleQuery = true
  }

  return filterSql
}
