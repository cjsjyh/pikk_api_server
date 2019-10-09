const { pool } = require("../../database/connectionPool")

import * as PostReturnType from "./type/ReturnType"
import { RunSingleSQL } from "../Util/util"

import { QueryResult, PoolClient } from "pg"

export async function GetPostFilterSql(filter: any): Promise<string> {
  let multipleQuery: Boolean = false
  let filterSql: string = ""

  if (Object.prototype.hasOwnProperty.call(filter, "accountId")) {
    filterSql = ` where "FK_accountId"=${filter.accountId}`
    multipleQuery = true
  } else if (Object.prototype.hasOwnProperty.call(filter, "postId")) {
    filterSql = ` where id=${filter.postId}`
    multipleQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "postType")) {
    if (multipleQuery) filterSql += " and"
    else filterSql += " where"
    filterSql += ` "postType"='${filter.postType}'`
    multipleQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "channelId")) {
    if (multipleQuery) filterSql += " and"
    else filterSql += " where"
    filterSql += ` "FK_channelId"='${filter.channelId}'`
    multipleQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "styleType")) {
    if (multipleQuery) filterSql += " and"
    else filterSql += " where"
    filterSql += ` "styleType"='${filter.styleType}'`
    multipleQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "itemId")) {
    try {
      let rows = await RunSingleSQL(`SELECT "FK_postId" FROM "ITEM_REVIEW" WHERE "FK_itemId"=${filter.itemId}`)
      if (rows.length == 0) return null

      let postIdSql = ""
      rows.forEach((row, index) => {
        if (index != 0) postIdSql += ","
        postIdSql += row.FK_postId
      })
      if (multipleQuery) filterSql += " and"
      else filterSql += " where"
      filterSql += ` id in (${postIdSql})`
      multipleQuery = true
    } catch (e) {
      throw new Error("[Error] Failed to fetch postId with itemId")
    }
  }

  return filterSql
}

export async function GetCommunityPostImage(postInfo: PostReturnType.CommunityPostInfo): Promise<QueryResult> {
  let rows = await RunSingleSQL(`SELECT "imageUrl" FROM "COMMUNITY_POST_IMAGE" where "FK_postId"=${postInfo.id}`)
  return rows
}
