//https://www.apollographql.com/docs/graphql-tools/resolvers/
var jwt = require("jsonwebtoken")
const { pool } = require("../database/connectionPool")

//IMPORT S3
import * as AWS from "aws-sdk"
//AWS.config.loadFromPath(path.join(__dirname, "/../config.json"))
const S3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "ap-northeast-2"
})

import { SequentialPromiseValue } from "./Util"
import * as ReturnType from "./type/ReturnType"
import { MutationArgInfo } from "./type/ArgType"
import * as ArgType from "./type/ArgType"

module.exports = {
  createUser: async (parent: void, args: MutationArgInfo, ctx: any): Promise<ReturnType.UserCredentialInfo> => {
    let arg: ArgType.UserCredentialInput = args.userAccountInfo
    //Make Connection
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      console.log(e)
      throw new Error("[Error] Failed Connecting to DB")
    }

    //Make UserCredential
    try {
      let userAccount: ReturnType.UserCredentialInfo
      let qResult = await client.query(
        `INSERT INTO "USER_CONFIDENTIAL" ("providerType", "providerId") VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING id`,
        [arg.providerType, arg.providerId]
      )
      if (qResult.rows.length == 0) {
        qResult = await client.query(
          `SELECT id FROM "USER_CONFIDENTIAL" where "providerType"='${arg.providerType}' and "providerId"=${arg.providerId}`
        )
        userAccount = qResult.rows[0]
        userAccount.isNewUser = false
        userAccount.token = jwt.sign({ id: userAccount.id }, process.env.PICKK_SECRET_KEY)
      } else {
        userAccount = qResult.rows[0]
        userAccount.isNewUser = true
        userAccount.token = jwt.sign({ id: userAccount.id }, process.env.PICKK_SECRET_KEY)
      }
      client.release()
      //var decoded = jwt.verify(userAccount.token, "TESTTTT")
      return userAccount
    } catch (e) {
      client.release()
      console.log(e)
      throw new Error("[Error]")
    }
  },

  createUserInfo: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
    let arg: ArgType.UserInfoInput = args.userInfo
    //Make Connection
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      console.log("[Error] Failed Connecting to DB")
      return false
    }

    //Make UserCredential
    try {
      let profileImgUrl = null
      if (Object.prototype.hasOwnProperty.call(arg, "profileImg")) {
        //Upload Image and retrieve URL
      }

      let qResult = await client.query(
        'INSERT INTO "USER_INFO"("FK_accountId","name","email","age","height","weight","profileImgUrl","phoneNum","address") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
        [arg.id, arg.name, arg.email, arg.age, arg.height, arg.weight, profileImgUrl, arg.phoneNum, arg.address]
      )

      await client.query('INSERT INTO "CHANNEL"("FK_accountId") VALUES ($1)', [arg.id])
      client.release()
      return true
    } catch (e) {
      client.release()
      console.log("[Error] Failed to Insert into USER_INFO")
      console.log(e)
      return false
    }
  },

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
    //Temporary//
    imageUrl = "testURL"
    //---------//
    if (Object.prototype.hasOwnProperty.call(arg, "itemImg")) {
      //Upload Image and retrieve URL
    }

    try {
      await client.query(
        'INSERT INTO "ITEM"("name","brand","originalPrice","salePrice","itemMajorType","itemMinorType","imageUrl") VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [arg.name, arg.brand, arg.originalPrice, arg.salePrice, arg.itemMajorType, arg.itemMinorType, imageUrl]
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

  createCommunityPost: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
    if (!ctx.IsVerified) throw new Error("USER NOT LOGGED IN!")
    let arg: ArgType.CommunityPostInfoInput = args.communityPostInfo
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      console.log("[Error] Failed Connecting to DB")
      return false
    }

    try {
      await client.query(
        'INSERT INTO "COMMUNITY_POST"("FK_accountId","FK_channelId","title","content","postType","qnaType") VALUES ($1,$2,$3,$4,$5,$6)',
        [arg.accountId, arg.channelId, arg.title, arg.content, arg.postType, arg.qnaType]
      )
      client.release()

      return true
    } catch (e) {
      client.release()
      console.log("[Error] Failed to Insert into COMMUNITY_POST")
      console.log(e)
      return false
    }
  },

  createRecommendPost: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
    if (!ctx.IsVerified) throw new Error("USER NOT LOGGED IN!")
    let arg: ArgType.RecommendPostInfoInput = args.recommendPostInfo
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      console.log("[Error] Failed Connecting to DB")
      return false
    }

    let imageUrl = null
    if (Object.prototype.hasOwnProperty.call(arg, "titleImg")) {
      //Upload Image and retrieve URL
      const { stream, filename, mimetype, encoding } = await arg.titleImg

      console.log(filename)
      console.log(mimetype)
      console.log(encoding)

      /*
      var param = {
        Bucket: "fashiondogam-images",
        Key: "image/" + "testimage.jpg",
        ACL: "public-read",
        Body: stream,
        ContentType: "image/jpg"
      }

      S3.upload(param, function(err: Error, data: AWS.S3.ManagedUpload.SendData) {
        if (err) {
          console.log(err)
        }
        console.log(data)
      })
      */
    }

    let recommendPostId: number
    try {
      let insertResult = await client.query(
        'INSERT INTO "RECOMMEND_POST"("FK_accountId","title","description","postType","styleType","imageUrl") VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
        [arg.accountId, arg.title, arg.content, arg.postType, arg.styleType, imageUrl]
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
      let ItemResult = await SequentialPromiseValue(arg.reviews, InsertItem)
      let ReviewResult = await SequentialPromiseValue(arg.reviews, InsertItemReview, [recommendPostId])
      await Promise.all(
        arg.reviews.map((review, index) => {
          return Promise.all(
            review.cards.map(card => {
              return InsertItemReviewCard(card, ReviewResult[index])
            })
          )
        })
      )

      return true
    } catch (e) {
      console.log("[Error] Failed at Sequential Promise")
      console.log(e)
      return false
    }
  },

  createComment: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
    if (!ctx.IsVerified) throw new Error("USER NOT LOGGED IN!")
    let arg: ArgType.CommentInfoInput = args.commentInfo
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      console.log("[Error] Failed Connecting to DB")
      return false
    }

    try {
      await client.query(`INSERT INTO ` + ConvertToTableName(arg.targetType) + `("FK_postId","FK_accountId","content") VALUES($1,$2,$3)`, [
        arg.targetId,
        arg.accountId,
        arg.content
      ])
      client.release()
      return true
    } catch (e) {
      client.release()
      console.log(e)
      return false
    }
  },

  FollowTarget: async (parent: void, args: MutationArgInfo, ctx: any): Promise<number> => {
    if (!ctx.IsVerified) throw new Error("USER NOT LOGGED IN!")
    let arg: ReturnType.FollowInfo = args.followInfo
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    let query = "SELECT toggle" + arg.targetType + "Follow($1,$2)"
    try {
      let result = await client.query(query, [arg.accountId, arg.targetId])
      client.release()
      result = Object.values(result.rows[0])
      return result[0]
    } catch (e) {
      client.release()
      console.log(e)
      throw new Error("[Error] Failed to Insert into FOLLOWER")
    }
  }
}

function ConvertToTableName(targetName: string): string {
  let tableName = ""
  if (targetName == "RECOMMEND") tableName = '"RECOMMEND_POST_COMMENT"'
  else if (targetName == "COMMUNITY") tableName = '"COMMUNITY_POST_COMMENT"'

  return tableName
}

function InsertItemReview(itemReview: ArgType.ItemReviewInfoInput, args: Array<number>): Promise<{}> {
  return new Promise(async (resolve, reject) => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      reject(e)
    }

    try {
      let postId = args[0]
      let insertResult = await client.query(
        'INSERT INTO "ITEM_REVIEW"("FK_itemId","FK_postId","recommendReason","shortReview","score") VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [itemReview.itemId, postId, itemReview.recommendReason, itemReview.shortReview, itemReview.score]
      )
      client.release()
      let reviewId = insertResult.rows[0].id
      console.log(`Inserted ReviewID: ${reviewId} for PostID: ${postId}`)
      resolve(reviewId)
    } catch (e) {
      client.release()
      console.log(e)
      reject(e)
    }
  })
}

function InsertItem(argReview: ArgType.ItemReviewInfoInput): Promise<{}> {
  return new Promise(async (resolve, reject) => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      console.log("[Error] Failed Connecting to DB")
      return false
    }

    let arg = argReview.item

    let imageUrl = null
    //Temporary//
    imageUrl = "testURL"
    //---------//
    if (Object.prototype.hasOwnProperty.call(arg, "itemImg")) {
      //Upload Image and retrieve URL
    }

    try {
      let itemId = await client.query(
        'INSERT INTO "ITEM"("name","brand","originalPrice","salePrice","itemMajorType","itemMinorType","imageUrl") VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
        [arg.name, arg.brand, arg.originalPrice, arg.salePrice, arg.itemMajorType, arg.itemMinorType, imageUrl]
      )
      client.release()
      console.log(itemId.rows[0].id)
      argReview.itemId = itemId.rows[0].id
      resolve()
    } catch (e) {
      client.release()
      console.log("[Error] Failed to Insert into ITEM")
      console.log(e)
      reject()
    }
  })
}

function InsertItemReviewCard(arg: ArgType.ItemReviewCardInfoInput, reviewId: number): Promise<{}> {
  return new Promise(async (resolve, reject) => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      console.log("[Error] Failed Connecting to DB")
      return false
    }
    let imageUrl = null
    //Temporary//
    imageUrl = "testURL"
    //---------//
    if (Object.prototype.hasOwnProperty.call(arg, "img")) {
      //Upload Image and retrieve URL
    }

    try {
      let cardId = await client.query('INSERT INTO "ITEM_REVIEW_CARD"("FK_reviewId","title","content","imgUrl") VALUES ($1,$2,$3,$4) RETURNING id', [
        reviewId,
        arg.title,
        arg.content,
        imageUrl
      ])
      client.release()
      console.log(`Inserted CardId: ${cardId.rows[0].id} for ReviewId: ${reviewId}`)
      resolve(cardId.rows[0].id)
    } catch (e) {
      client.release()
      console.log("[Error] Failed to Insert into ITEM_REVIEW_CARD")
      console.log(e)
      reject()
    }
  })
}
