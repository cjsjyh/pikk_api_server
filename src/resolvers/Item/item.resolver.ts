import * as AWS from "aws-sdk"
const { pool } = require("../../database/connectionPool")
const { S3 } = require("../../database/aws_s3")

import * as ArgType from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { QueryArgInfo } from "./type/ArgType"
import { MutationArgInfo } from "./type/ArgType"
import { GetMetaData, RunSingleSQL, ExtractFieldFromList } from "../Utils/promiseUtil"
import { GetFormatSql, MakeMultipleQuery, ConvertListToOrderedPair } from "../Utils/stringUtil"

import { GraphQLResolveInfo } from "graphql"
import { InsertItem, GetItemsById, GetItemIdInRanking } from "./util"

module.exports = {
  Query: {
    allItems: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<ReturnType.ItemInfo[]> => {
      let arg: ArgType.ItemQuery = args.itemOption
      try {
        let formatSql = GetFormatSql(arg)
        let idList = []
        let filterSql: string = ""
        if (Object.prototype.hasOwnProperty.call(arg, "itemFilter")) {
          filterSql = GetItemFilterSql(arg.itemFilter)
        }
        let itemResult = await GetItemsById(idList, formatSql, filterSql)
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
      let queryResult = await RunSingleSQL(`SELECT "FK_itemId" FROM "ITEM_FOLLOWER" WHERE "FK_accountId"=${arg.userId}`)
      let idList = ExtractFieldFromList(queryResult, "FK_itemId")

      let itemResult = await GetItemsById(idList, formatSql)

      return itemResult
    },

    getItemRanking: async (parent: void, args: QueryArgInfo): Promise<ReturnType.ItemInfo[]> => {
      let rankList = await GetItemIdInRanking()
      let itemIdList = ExtractFieldFromList(rankList, "id")
      let customFilterSql = `
        JOIN (
          VALUES
        ${ConvertListToOrderedPair(itemIdList)}
        ) AS x (id,ordering) ON item_var.id = x.id
      `
      let itemList = await GetItemsById(itemIdList, "", customFilterSql)
      return itemList
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
  let multipleQuery: boolean = false
  let filterSql: string = ""

  if (Object.prototype.hasOwnProperty.call(filter, "itemMajorType")) {
    filterSql = ` where "itemMajorType"='${filter.itemMajorType}'`
    multipleQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "itemMinorType")) {
    filterSql = MakeMultipleQuery(multipleQuery, filterSql, ` "itemMinorType"='${filter.itemMinorType}'`)
    multipleQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "itemId")) {
    filterSql = MakeMultipleQuery(multipleQuery, filterSql, ` item_var.id=${filter.itemId}`)
    multipleQuery = true
  }

  return filterSql
}
