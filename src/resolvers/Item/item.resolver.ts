import * as AWS from "aws-sdk"
const { pool } = require("../../database/connectionPool")
const { S3 } = require("../../database/aws_s3")

import * as ArgType from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { QueryArgInfo } from "./type/ArgType"
import { MutationArgInfo } from "./type/ArgType"
import { GetMetaData, getFormatDate, getFormatHour, RunSingleSQL, GetFormatSql } from "../Util/util"

import { GraphQLResolveInfo } from "graphql"

module.exports = {
  Query: {
    allItems: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<ReturnType.ItemInfo[]> => {
      let arg: ArgType.ItemQuery = args.itemOption
      let client
      try {
        client = await pool.connect()
      } catch (e) {
        throw new Error("[Error] Failed Connecting to DB")
      }

      try {
        let formatSql = GetFormatSql(arg)
        let filterSql: string = ""
        if (Object.prototype.hasOwnProperty.call(arg, "itemFilter")) {
          filterSql = GetItemFilterSql(arg.itemFilter)
        }

        let querySql = `
        WITH bbb as (SELECT 
          "ITEM_VARIATION".*, 
          "ITEM_GROUP"."itemMinorType",  
          "ITEM_GROUP"."itemMajorType",
          "ITEM_GROUP"."originalPrice",
          "ITEM_GROUP"."FK_brandId"
          FROM "ITEM_VARIATION" INNER JOIN "ITEM_GROUP" ON "ITEM_VARIATION"."FK_itemGroupId" = "ITEM_GROUP".id
        ) SELECT 
          bbb.*, 
          "BRAND"."nameKor", 
          "BRAND"."nameEng" 
          FROM "BRAND" INNER JOIN bbb on "BRAND".id = bbb."FK_brandId"
        `

        let queryResult = await client.query(querySql + filterSql + formatSql)
        let itemResult: ReturnType.ItemInfo[] = queryResult.rows

        await Promise.all(
          itemResult.map(async (item: ReturnType.ItemInfo) => {
            queryResult = await client.query(`SELECT COUNT(*) FROM "ITEM_FOLLOWER" where "FK_itemId"=${item.id}`)
            item.pickCount = queryResult.rows[0].count
          })
        )

        client.release()
        return itemResult
      } catch (e) {
        client.release()
        console.log(e)
        throw new Error("[Error] Failed to fetch data from DB")
      }
    },

    _allItemsMetadata: async (parent: void, args: QueryArgInfo): Promise<number> => {
      return GetMetaData("ITEM_VARIATION")
    },

    getUserPickkItem: async (parent: void, args: QueryArgInfo): Promise<ReturnType.ItemInfo[]> => {
      let arg: ArgType.PickkItemQuery = args.pickkItemOption

      let formatSql = GetFormatSql(arg)
      let postSql =
        `WITH 
        bbb as (SELECT "FK_itemId" FROM "ITEM_FOLLOWER" WHERE "FK_accountId"=${arg.userId}),
        ccc as (SELECT aaa.* from "ITEM_VARIATION" as aaa INNER JOIN bbb on aaa.id = bbb."FK_itemId"` +
        formatSql +
        `), ` +
        `ddd as (SELECT ccc.*, 
          "ITEM_GROUP"."itemMinorType",  
          "ITEM_GROUP"."itemMajorType",
          "ITEM_GROUP"."originalPrice",
          "ITEM_GROUP"."FK_brandId"
        FROM "ITEM_GROUP" INNER JOIN ccc ON ccc."FK_itemGroupId" = "ITEM_GROUP".id) 
        SELECT
            ddd.*,
            "BRAND"."nameKor",
            "BRAND"."nameEng"
            FROM "BRAND" INNER JOIN ddd on "BRAND".id = ddd."FK_brandId"
        `

      let rows = await RunSingleSQL(postSql)
      return rows
    }
  },
  Mutation: {
    createItem: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      if (!ctx.IsVerified) throw new Error("USER NOT LOGGED IN!")
      let arg: ArgType.ItemInfoInput = args.itemInfoInput

      try {
        let queryResult
        let groupId
        if (arg.createItemLevel == "GROUP") {
          let brandId
          //Find Brand Id for the group
          if (arg.groupInfo.isNewBrand == true) {
            queryResult = RunSingleSQL(`INSERT INTO "BRAND"("nameEng") VALUE('${arg.groupInfo.brand}') RETURNING id`)
            brandId = queryResult.id
          } else {
            queryResult = RunSingleSQL(`SELECT id FROM "BRAND" WHERE "nameEng"=${arg.groupInfo.brand} OR "nameKor"=${arg.groupInfo.brand}`)
            brandId = queryResult.id
          }

          //Create new Group and save Id
          queryResult = RunSingleSQL(`
            INSERT INTO "ITEM_GROUP" ("itemMinorType","itemMajorType","originalPrice","sourceWebsite","FK_brandId") 
            VALUES ('
            ${arg.groupInfo.itemMinorType}','${arg.groupInfo.itemMajorType}',
            ${arg.groupInfo.originalPrice},'${arg.groupInfo.sourceWebsite}',${brandId})
            RETURNING id`)
          groupId = queryResult.id
        } else {
          //Find Group Id of this Item
          queryResult = RunSingleSQL(`SELECT id FROM "ITEM_GROUP" WHERE id = ${arg.variationInfo.groupId}`)
          groupId = queryResult.id
        }

        //Insert Variation
        queryResult = RunSingleSQL(`INSERT INTO "ITEM_VARIATION"("name","imageUrl","purchaseUrl","salePrice","FK_itemGroupId")
          VALUES('${arg.variationInfo.name}','${arg.variationInfo.imageUrl}','${arg.variationInfo.purchaseUrl}','${arg.variationInfo.salePrice}','${groupId}')`)

        console.log(`Item ${arg.variationInfo.name} created`)
        return true
      } catch (e) {
        console.log("[Error] Failed to Insert into ITEM_VARIATION")
        console.log(e)
        return false
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
    filterSql += ` "id"='${filter.itemId}'`
    multipleQuery = true
  }

  return filterSql
}
