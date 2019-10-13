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
            item_var.*,
            item_group.*,
            (SELECT AVG(r.score) as "averageScore"
            FROM "ITEM_REVIEW" r
            WHERE r."FK_itemId" = item_var.id
            ),
            (SELECT COUNT(*) as "pickCount"
            FROM "ITEM_FOLLOWER" f
            WHERE f."FK_itemId" = item_var.id
            )
          FROM 
          "ITEM_VARIATION" item_var
          INNER JOIN "ITEM_GROUP" as item_group ON item_var."FK_itemGroupId" = item_group.id ${filterSql}
        ) as item_full
        INNER JOIN "BRAND" on "BRAND".id = item_full."FK_brandId" WHERE item_full."averageScore" IS NOT NULL ${formatSql}
        `
        let queryResult = await GetItems(querySql)
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
      WITH bbb as (SELECT "FK_itemId" as item_id FROM "ITEM_FOLLOWER" WHERE "FK_accountId"=${arg.userId})
      SELECT
        item_full.*,
        "BRAND"."nameKor",
        "BRAND"."nameEng"
      FROM
      (
        SELECT item_var.*,item_group.*,
          (SELECT AVG(r.score) as "averageScore"
          FROM "ITEM_REVIEW" r
          WHERE r."FK_itemId" = bbb.item_id
          ),
          (SELECT COUNT(*) as "pickCount"
          FROM "ITEM_FOLLOWER" f
          WHERE bbb.item_id = f."FK_itemId"
          ) 
        FROM bbb,"ITEM_VARIATION" item_var
        INNER JOIN "ITEM_GROUP" as item_group ON item_var."FK_itemGroupId" = item_group.id WHERE item_var.id = bbb.item_id
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
    filterSql += ` item_var.id=${filter.itemId}`
    multipleQuery = true
  }

  return filterSql
}
