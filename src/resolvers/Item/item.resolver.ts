import * as AWS from "aws-sdk"
const { pool } = require("../../database/connectionPool")
const { S3 } = require("../../database/aws_s3")

import * as ArgType from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { QueryArgInfo } from "./type/ArgType"
import { MutationArgInfo } from "./type/ArgType"
import { GetMetaData, getFormatDate, getFormatHour, RunSingleSQL } from "../util/Util"

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
        let sortSql: string
        sortSql = " ORDER BY " + arg.sortBy + " " + arg.filterCommon.sort
        let limitSql: string
        limitSql = " LIMIT " + arg.filterCommon.first + " OFFSET " + arg.filterCommon.start

        let filterSql: string = ""
        if (Object.prototype.hasOwnProperty.call(arg, "itemFilter")) {
          filterSql = GetItemFilterSql(arg.itemFilter)
        }

        let queryResult = await client.query('SELECT * FROM "ITEM"' + filterSql + sortSql + limitSql)
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
      return GetMetaData("ITEM")
    },

    getUserPickkItem: async (parent: void, args: QueryArgInfo): Promise<ReturnType.ItemInfo[]> => {
      let arg: ArgType.PickkItemQuery = args.pickkItemOption

      let limitSql = " LIMIT " + arg.filterCommon.first + " OFFSET " + arg.filterCommon.start
      let postSql =
        `WITH bbb as (SELECT "FK_itemId" FROM "ITEM_FOLLOWER" WHERE "FK_accountId"=${arg.userId}) 
    SELECT aaa.* from "ITEM" as aaa 
    INNER JOIN bbb on aaa.id = bbb."FK_itemId"` + limitSql

      let rows = await RunSingleSQL(postSql)
      return rows
    }
  },
  Mutation: {
    createItem: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      if (!ctx.IsVerified) throw new Error("USER NOT LOGGED IN!")
      let arg: ReturnType.ItemInfo = args.itemInfo
      let client
      try {
        client = await pool.connect()
      } catch (e) {
        console.log("[Error] Failed Connecting to DB")
        return false
      }

      let imageUrl = null
      if (Object.prototype.hasOwnProperty.call(arg, "itemImg")) {
        //Upload Image and retrieve URL
        const { createReadStream, filename, mimetype, encoding } = await arg.itemImg

        let date = getFormatDate(new Date())
        let hour = getFormatHour(new Date())

        var param = {
          Bucket: "fashiondogam-images",
          Key: "image/" + date + hour + filename,
          ACL: "public-read",
          Body: createReadStream(),
          ContentType: mimetype
        }

        await new Promise((resolve, reject) => {
          S3.upload(param, function(err: Error, data: AWS.S3.ManagedUpload.SendData) {
            if (err) {
              console.log(err)
              reject(err)
            }
            console.log(data)
            imageUrl = data.Location
            resolve()
          })
        })
      }

      try {
        await client.query(
          'INSERT INTO "ITEM"("name","brand","originalPrice","salePrice","itemMajorType","itemMinorType","imageUrl") VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [arg.name, arg.brand, arg.originalPrice, arg.salePrice, arg.itemMajorType, arg.itemMinorType, imageUrl]
        )
        client.release()
        console.log(`Item ${arg.name} created`)
        return true
      } catch (e) {
        client.release()
        console.log("[Error] Failed to Insert into ITEM")
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
