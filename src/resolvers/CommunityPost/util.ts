const { pool } = require("../../database/connectionPool")

import * as PostReturnType from "./type/ReturnType"
import { RunSingleSQL, DeployImageBy4Versions } from "../Utils/promiseUtil"

import { MakeMultipleQuery, InsertImageIntoDeleteQueue } from "../Utils/stringUtil"
import { CommunityPostContentEditInput, CommunityPostContentInput } from "./type/ArgType"

var logger = require("../../tools/logger")

export async function GetPostFilterSql(filter: any): Promise<string> {
  let multipleQuery: boolean = false
  let filterSql: string = ""

  if (Object.prototype.hasOwnProperty.call(filter, "accountId")) {
    filterSql = ` where "FK_accountId"=${filter.accountId}`
    multipleQuery = true
  } else if (Object.prototype.hasOwnProperty.call(filter, "postId")) {
    filterSql = ` where id=${filter.postId}`
    multipleQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "postType") && filter.postType != "ALL") {
    filterSql = MakeMultipleQuery(multipleQuery, filterSql, ` "postType"='${filter.postType}'`)
    multipleQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "channelId")) {
    filterSql = MakeMultipleQuery(multipleQuery, filterSql, ` "FK_channelId"='${filter.channelId}'`)
    multipleQuery = true
  }

  if (Object.prototype.hasOwnProperty.call(filter, "styleType")) {
    filterSql = MakeMultipleQuery(multipleQuery, filterSql, ` "styleType"='${filter.styleType}'`)
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
      filterSql = MakeMultipleQuery(multipleQuery, filterSql, ` id in (${postIdSql})`)
      multipleQuery = true
    } catch (e) {
      throw new Error("[Error] Failed to fetch postId with itemId")
    }
  }

  return filterSql
}

export async function CreateEditCommunityPostContent(postId: number, content: CommunityPostContentEditInput, index: number) {
  try {
    //Update
    if (content.id) {
      await UpdateCommunityPostContent(content, index)
    }
    //Add new
    else {
      await InsertCommunityPostContent(postId, content, index)
    }
  } catch (e) {
    logger.warn("Failed to Edit CommunityPost Content")
    logger.error(e.stack)
  }
}

export async function InsertCommunityPostContent(postId: number, content: CommunityPostContentEditInput | CommunityPostContentInput, index: number) {
  if (content.contentType == "TEXT") {
    await RunSingleSQL(`
    INSERT INTO "COMMUNITY_POST_CONTENT" ("FK_postId","text","contentType","order")
    VALUES (${postId},'${content.text}','${content.contentType}',${index})
  `)
  } else if (content.contentType == "IMAGE") {
    let deployedUrl = await DeployImageBy4Versions(content.imageUrl)
    await RunSingleSQL(`
    INSERT INTO "COMMUNITY_POST_CONTENT" ("FK_postId","imageUrl","contentType","order")
    VALUES (${postId},'${deployedUrl}','${content.contentType}',${index})
  `)
  }
}

export async function UpdateCommunityPostContent(content: CommunityPostContentEditInput, index: number) {
  if (content.contentType == "TEXT") {
    await RunSingleSQL(`
    UPDATE "COMMUNITY_POST_CONTENT" SET 
      "text"='${content.text}',
      "contentType"='${content.contentType}',
      "order"=${index}
    WHERE id=${content.id}
  `)
  } else if (content.contentType == "IMAGE") {
    let deployedUrl = await DeployImageBy4Versions(content.imageUrl)
    let deleteImageSql = ""
    if (deployedUrl != content.imageUrl) deleteImageSql = InsertImageIntoDeleteQueue("COMMUNITY_POST_CONTENT", "imageUrl", "id", [content.id])
    else console.log("Same Image!")
    await RunSingleSQL(`
    ${deleteImageSql}
    UPDATE "COMMUNITY_POST_CONTENT" SET 
      "imageUrl"='${deployedUrl}',
      "contentType"='${content.contentType}',
      "order"=${index}
    WHERE id=${content.id}
  `)
  }
}
