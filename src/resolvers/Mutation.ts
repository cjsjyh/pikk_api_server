//https://www.apollographql.com/docs/graphql-tools/resolvers/

import * as CustomType from "./Type"
import { ArgInfo } from "./Type"
import { createCipher } from "crypto"
const { pool } = require("../database/connectionPool")

module.exports = {
  RegisterUser: async (parent: void, args: ArgInfo): Promise<Boolean> => {
    //Make Connection
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      console.log("[Error] Failed Connecting to DB")
      return false
    }

    let arg: CustomType.UserInfo = args.userInfo
    //arg.prototype = Object
    console.log("ARGs!!!")
    console.log(args)
    console.log("ARG!!!")
    console.log(arg)
    //Make UserCredential
    let id
    try {
      let qResult = await client.query(
        'INSERT INTO "USER_CONFIDENTIAL"("username","password") VALUES ($1,$2) RETURNING *',
        [arg.username, arg.password]
      )
      id = qResult.rows[0].id
    } catch (e) {
      client.release()
      console.log("[Error] Failed to Insert into USER_CONFIDENTIAL")
      console.log(e)
      return false
    }

    let profileImgUrl = null
    console.log(arg)

    if (Object.prototype.hasOwnProperty.call(arg, "profileImg")) {
      //Upload Image and retrieve URL
    }

    //Make UserInfo
    try {
      let qResult = await client.query(
        'INSERT INTO "USER_INFO"("FK_accountId","name","email","age","height","weight","profileImg","phoneNum","address") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
        [
          id,
          arg.name,
          arg.email,
          arg.age,
          arg.height,
          arg.weight,
          profileImgUrl,
          arg.phoneNum,
          arg.address
        ]
      )
    } catch (e) {
      //Delete Inserted Row
      await client.query('DELETE FROM "USER_CONFIDENTIAL" WHERE id=$1', [id])
      client.release()
      console.log("[Error] Failed to Insert into User_Info")
      console.log(e)
      return false
    }

    try {
      await client.query('INSERT INTO "CHANNEL"("FK_accountId") VALUES ($1)', [id])
      client.release()
      return true
    } catch (e) {
      client.release()
      console.log("[Error] Failed to Insert into Channel")
      console.log(e)
      return false
    }
  },

  RegisterItem: async (parent: void, args: ArgInfo): Promise<Boolean> => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      console.log("[Error] Failed Connecting to DB")
      return false
    }

    let arg: CustomType.ItemInfo = args.itemInfo

    let itemImgUrl = null
    //Temporary//
    itemImgUrl = "testURL"
    //---------//
    if (Object.prototype.hasOwnProperty.call(arg, "itemImg")) {
      //Upload Image and retrieve URL
    }
    if (!Object.prototype.hasOwnProperty.call(arg, "currentPrice")) {
      arg.currentPrice = arg.originalPrice
    }

    try {
      await client.query(
        'INSERT INTO "ITEM"("name","brand","originalPrice","currentPrice","itemType","imageUrl") VALUES ($1,$2,$3,$4,$5,$6)',
        [arg.name, arg.brand, arg.originalPrice, arg.currentPrice, arg.itemType, itemImgUrl]
      )
      client.release()
      return true
    } catch (e) {
      client.release()
      console.log("[Error] Failed to Insert into ITEM")
      console.log(e)
      return false
    }
  },

  PostChannelArticle: async (parent: void, args: ArgInfo): Promise<Boolean> => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      console.log("[Error] Failed Connecting to DB")
      return false
    }

    let arg: CustomType.PostInfo = args.postInfo
    try {
      await client.query(
        'INSERT INTO "CHANNEL_POST"("FK_accountId","FK_channelId","title","content") VALUES ($1,$2,$3,$4)',
        [arg.accountId, arg.channelId, arg.title, arg.content]
      )
      client.release()

      return true
    } catch (e) {
      client.release()
      console.log("[Error] Failed to Insert into CHANNEL_POST")
      console.log(e)
      return false
    }
  },

  PostComment: async (parent: void, args: ArgInfo): Promise<Boolean> => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    let arg: CustomType.CommentInfo = args.commentInfo
    if (!ValidateCommentType(arg.targetType)) return false

    try {
      await client.query(
        `INSERT INTO ` +
          ConvertToTableName(arg.targetType) +
          `("FK_postId","FK_accountId","content") VALUES($1,$2,$3)`,
        [arg.targetId, arg.accountId, arg.content]
      )
      client.release()
      return true
    } catch (e) {
      client.release()
      console.log(e)
      return false
    }
  },

  PostRecommendArticle: async (parent: void, args: ArgInfo): Promise<Boolean> => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      console.log("[Error] Failed Connecting to DB")
      return false
    }

    let arg: CustomType.PostInfo = args.postInfo
    let itemImgUrl = null
    if (Object.prototype.hasOwnProperty.call(arg, "img")) {
      //Upload Image and retrieve URL
    }

    let recommendPostId: number
    try {
      let insertResult = await client.query(
        'INSERT INTO "RECOMMEND_POST"("FK_accountId","title","description","postTag","styleTag","imageUrl") VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
        [arg.accountId, arg.title, arg.content, arg.postTag, arg.styleTag, itemImgUrl]
      )
      client.release()
      recommendPostId = insertResult.rows[0].id
    } catch (e) {
      client.release()
      console.log("[Error] Failed to Insert into RECOMMEND_POST")
      console.log(e)
      return false
    }

    try {
      let InsertResult = await Promise.all(
        arg.review.map(item => InsertItemReview(recommendPostId, item))
      )
      console.log(InsertResult)
      return true
    } catch (e) {
      return false
    }
  },

  FollowTarget: async (parent: void, args: ArgInfo): Promise<number> => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    let arg: CustomType.FollowInfo = args.followInfo
    if (!ValidateFollowType(arg.targetType)) throw new Error("[Error] Invalid Type to Follow")

    let query = "SELECT toggle" + arg.targetType + "Follow($1,$2)"
    try {
      let result = await client.query(query, [arg.accountId, arg.targetId])
      client.release()
      result = Object.values(result.rows[0])
      return result[0]
    } catch (e) {
      client.release()
      console.log(e)
      throw new Error("[Error] Failed to Insert into CHANNEL_FOLLOWER")
    }
  }
}

function ValidateFollowType(followType: string): Boolean {
  return ["Item", "RecommendPost", "Channel"].includes(followType)
}

function ValidateCommentType(commentType: string): Boolean {
  return ["RecommendPost", "ChannelPost"].includes(commentType)
}

function ConvertToTableName(targetName: string): string {
  let tableName = ""
  switch (targetName) {
    case "ChannelPost":
      tableName = '"CHANNEL_POST_COMMENT"'
      break
    case "RecommendPost":
      tableName = '"RECOMMEND_POST_COMMENT"'
      break
  }
  return tableName
}

function InsertItemReview(postId: number, itemReview: CustomType.itemReviewInfo): Promise<{}> {
  return new Promise(async (resolve, reject) => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      reject(e)
    }

    let itemImgUrl = null
    if (Object.prototype.hasOwnProperty.call(itemReview, "reviewImg")) {
      //Upload Image and retrieve URL
    }

    try {
      let insertResult = await client.query(
        'INSERT INTO "ITEM_REVIEW"("FK_itemId","FK_postId","recommendationTag","shortReview","fullReview","score") VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
        [
          itemReview.itemId,
          postId,
          itemReview.recommendTag,
          itemReview.shortReview,
          itemReview.fullReview,
          itemReview.score
        ]
      )
      client.release()
      let reviewId = insertResult.rows[0].id
      resolve(reviewId)
    } catch (e) {
      client.release()
      console.log(e)
      reject(e)
    }
  })
}
