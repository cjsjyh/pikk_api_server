//https://www.apollographql.com/docs/graphql-tools/resolvers/

import { UserInfo, ItemInfo, PostInfo } from "./Type"
const { pool } = require("../database/connectionPool")

module.exports = {
  RegisterUser: async (parent: Object, args: UserInfo): Promise<Boolean> => {
    //Make Connection
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      console.log("[Error] Failed Connecting to DB")
      return false
    }

    //Make UserCredential
    let id
    try {
      let qResult = await client.query(
        'INSERT INTO "USER_CONFIDENTIAL"("username","password") VALUES ($1,$2) RETURNING *',
        [args.username, args.password]
      )
      id = qResult.rows[0].id
    } catch (e) {
      client.release()
      console.log("[Error] Failed to Insert into USER_CONFIDENTIAL")
      console.log(e)
      return false
    }

    let profileImgUrl = null
    if (args.hasOwnProperty("profileImg")) {
      //Upload Image and retrieve URL
    }

    //Make UserInfo
    try {
      let qResult = await client.query(
        'INSERT INTO "USER_INFO"("FK_accountId","name","email","age","height","weight","profileImg","phoneNum","address") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
        [
          id,
          args.name,
          args.email,
          args.age,
          args.height,
          args.weight,
          profileImgUrl,
          args.phoneNum,
          args.address
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

  RegisterItem: async (parent: void, args: ItemInfo): Promise<Boolean> => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      console.log("[Error] Failed Connecting to DB")
      return false
    }

    let itemImgUrl = null
    //Temporary//
    itemImgUrl = "testURL"
    //---------//
    if (args.hasOwnProperty("itemImg")) {
      //Upload Image and retrieve URL
    }
    if (!args.hasOwnProperty("args.currentPrice")) {
      args.currentPrice = args.originalPrice
    }

    try {
      await client.query(
        'INSERT INTO "ITEM"("name","brand","originalPrice","currentPrice","itemType","imageUrl") VALUES ($1,$2,$3,$4,$5,$6)',
        [args.name, args.brand, args.originalPrice, args.currentPrice, args.itemType, itemImgUrl]
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

  PostChannelPost: async (parent: void, args: PostInfo): Promise<Boolean> => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      console.log("[Error] Failed Connecting to DB")
      return false
    }

    try {
      await client.query(
        'INSERT INTO "CHANNEL_POST"("FK_accountId","FK_channelId","title","content") VALUES ($1,$2,$3,$4)',
        [args.accountId, args.channelId, args.title, args.content]
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

  PostRecommendPost: async (parent: void, args: PostInfo): Promise<Boolean> => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      console.log("[Error] Failed Connecting to DB")
      return false
    }

    let itemImgUrl = null
    if (args.hasOwnProperty("img")) {
      //Upload Image and retrieve URL
    }

    try {
      await client.query(
        'INSERT INTO "RECOMMEND_POST"("FK_accountId","title","description","postTag","styleTag","imageUrl") VALUES ($1,$2,$3,$4,$5,$6)',
        [args.accountId, args.title, args.content, args.postTag, args.styleTag, itemImgUrl]
      )
      client.release()

      return true
    } catch (e) {
      client.release()
      console.log("[Error] Failed to Insert into RECOMMEND_POST")
      console.log(e)
      return false
    }
  }
}
