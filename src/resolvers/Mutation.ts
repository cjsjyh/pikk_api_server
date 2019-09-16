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

import { SequentialPromiseValue, getFormatDate, getFormatHour, RunSingleSQL } from "./Util"
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
      let queryResult = await client.query(
        `INSERT INTO "USER_CONFIDENTIAL" ("providerType", "providerId") VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING id`,
        [arg.providerType, arg.providerId]
      )
      if (queryResult.rows.length == 0) {
        queryResult = await client.query(
          `SELECT id FROM "USER_CONFIDENTIAL" where "providerType"='${arg.providerType}' and "providerId"='${arg.providerId}'`
        )
        userAccount = queryResult.rows[0]
        queryResult = await client.query(`SELECT * FROM "USER_INFO" WHERE "FK_accountId"=${userAccount.id}`)
        //If user didn't insert user info yet
        if (queryResult.rows.length == 0) userAccount.isNewUser = true
        else {
          userAccount.isNewUser = false
          userAccount.name = queryResult.rows[0].name
          userAccount.profileImgUrl = queryResult.rows[0].profileImgUrl
          userAccount.rank = queryResult.rows[0].rank
        }
        userAccount.token = jwt.sign({ id: userAccount.id }, process.env.PICKK_SECRET_KEY)
      } else {
        userAccount = queryResult.rows[0]
        userAccount.isNewUser = true
        userAccount.token = jwt.sign({ id: userAccount.id }, process.env.PICKK_SECRET_KEY)
      }
      client.release()
      console.log(`User ${userAccount.id} Created`)
      return userAccount
    } catch (e) {
      client.release()
      console.log(e)
      throw new Error("[Error] Failed to create User")
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
        const { createReadStream, filename, mimetype, encoding } = await arg.profileImg

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
            profileImgUrl = data.Location
            resolve()
          })
        })
      }

      let qResult
      if (profileImgUrl != null) {
        qResult = await client.query(
          'INSERT INTO "USER_INFO"("FK_accountId","name","email","age","height","weight","profileImgUrl","phoneNum","address") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
          [arg.id, arg.name, arg.email, arg.age, arg.height, arg.weight, profileImgUrl, arg.phoneNum, arg.address]
        )
      } else {
        qResult = await client.query(
          'INSERT INTO "USER_INFO"("FK_accountId","name","email","age","height","weight","phoneNum","address") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
          [arg.id, arg.name, arg.email, arg.age, arg.height, arg.weight, arg.phoneNum, arg.address]
        )
      }
      client.release()
      console.log(`User Info for User ${arg.id} created`)
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
      /*
      let profileImgUrl = null
      if (Object.prototype.hasOwnProperty.call(arg, "img")) {
        arg.img.forEach(async item => {
          const { createReadStream, filename, mimetype, encoding } = await item

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
        })
      }
      */
      await client.query(
        'INSERT INTO "COMMUNITY_POST"("FK_accountId","FK_channelId","title","content","postType","qnaType") VALUES ($1,$2,$3,$4,$5,$6)',
        [arg.accountId, arg.channelId, arg.title, arg.content, arg.postType, arg.qnaType]
      )
      client.release()
      console.log(`Community Post has been created by User ${arg.accountId}`)
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
    if (arg.titleType == "IMAGE") {
      if (!Object.prototype.hasOwnProperty.call(arg, "titleImg")) {
        client.release()
        throw new Error("[Error] title type IMAGE but no image sent!")
      }
      //Upload Image and retrieve URL
      const { createReadStream, filename, mimetype, encoding } = await arg.titleImg

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

    let recommendPostId: number
    try {
      let insertResult = await client.query(
        'INSERT INTO "RECOMMEND_POST"("FK_accountId","title","content","postType","styleType","titleType","titleYoutubeUrl","titleImageUrl") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
        [arg.accountId, arg.title, arg.content, arg.postType, arg.styleType, arg.titleType, arg.titleYoutubeUrl, imageUrl]
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
      console.log(`Recommend Post created by User${arg.accountId}`)
      return true
    } catch (e) {
      console.log("[Error] Failed to create RecommendPost")
      console.log(e)
      return false
    }
  },

  createComment: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
    if (!ctx.IsVerified) throw new Error("USER NOT LOGGED IN!")
    let arg: ArgType.CommentInfoInput = args.commentInfo

    let querySql =
      `INSERT INTO ` +
      ConvertToTableName(arg.targetType) +
      `("FK_postId","FK_accountId","content") VALUES(${arg.targetId},${arg.accountId},'${arg.content}')`

    try {
      let rows = await RunSingleSQL(querySql)
      console.log(`Comment created by User${arg.accountId} on Post${arg.targetType} id ${arg.targetId}`)
      return true
    } catch (e) {
      console.log("[Error] Failed to create Comment")
      return false
    }
  },

  FollowTarget: async (parent: void, args: MutationArgInfo, ctx: any): Promise<number> => {
    if (!ctx.IsVerified) throw new Error("USER NOT LOGGED IN!")
    let arg: ReturnType.FollowInfo = args.followInfo

    try {
      let query = `SELECT toggle" + arg.targetType + "Follow(${arg.accountId},${arg.targetId})`
      let result = await RunSingleSQL(query)
      result = Object.values(result.rows[0])
      console.log(`Followed User${arg.accountId} Followed ${arg.targetType} id: ${arg.targetId}`)
      return result[0]
    } catch (e) {
      console.log("[Error] Failed to Insert into FOLLOWER")
      console.log(e)
      throw new Error("[Error] Failed to Insert into FOLLOWER")
    }
  },

  isFollowingTarget: async (parent: void, args: MutationArgInfo): Promise<Boolean> => {
    let arg: ReturnType.FollowInfo = args.followInfo

    let tableName
    let variableName
    if (arg.targetType == "ITEM") {
      tableName = "ITEM"
      variableName = "itemId"
    } else if (arg.targetType == "RECOMMENDPOST") {
      tableName = "RECOMMEND_POST"
      variableName = "postId"
    } else if (arg.targetType == "CHANNEL") {
      tableName = "CHANNEL"
      variableName = "channelId"
    }

    try {
      let query = `SELECT "FK_accountId" FROM "${tableName}_FOLLOWER" WHERE "FK_accountId"=${arg.accountId} and "FK_${variableName}"=${arg.targetId}`
      let result = await RunSingleSQL(query)
      if (result.length == 0) return false
      else return true
    } catch (e) {
      console.log("[Error] Failed to check following status")
      console.log(e)
      throw new Error("[Error] Failed to check following status")
    }
  },

  IncrementViewCount: async (parent: void, args: any): Promise<Boolean> => {
    try {
      let query = `UPDATE "${args.postType}_POST" SET "viewCount" = "viewCount" + 1 WHERE id = ${args.postId}`
      let result = await RunSingleSQL(query)
      return true
    } catch (e) {
      console.log(`[Error] Failed to increase view count for ${args.postType} ${args.postId}`)
      console.log(e)
      return false
    }
  },

  isDuplicateName: async (parent: void, args: any): Promise<Boolean> => {
    try {
      let query = `SELECT * FROM "USER_INFO" WHERE name='${args.name}'`
      let result = await RunSingleSQL(query)
      console.log(`Checked DuplicateName ${args.name}`)

      if (result.length != 0) return true
      return false
    } catch (e) {
      console.log(`[Error] Failed to check Duplicate for ${args.name}`)
      console.log(e)
      throw new Error(`[Error] Failed to check Duplicate for ${args.name}`)
    }
  },

  deleteRecommendPost: async (parent: void, args: any): Promise<Boolean> => {
    try {
      let query = `DELETE FROM "RECOMMEND_POST" WHERE id=${args.postId}`
      let result = await RunSingleSQL(query)
      console.log(`DELETE FROM "RECOMMEND_POST" WHERE id=${args.postId}`)
      return true
    } catch (e) {
      console.log(`[Error] Delete RecommendPost id: ${args.postId} Failed!`)
      console.log(e)
      throw new Error(`[Error] Delete RecommendPost id: ${args.postId} Failed!`)
    }
  },

  deleteCommunityPost: async (parent: void, args: any): Promise<Boolean> => {
    try {
      let query = `DELETE FROM "COMMUNITY_POST" WHERE id=${args.postId}`
      let result = await RunSingleSQL(query)
      console.log(query)
      return true
    } catch (e) {
      console.log(`[Error] Delete CommunityPost id: ${args.postId} Failed!`)
      console.log(e)
      throw new Error(`[Error] Delete CommunityPost id: ${args.postId} Failed!`)
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
      let imageUrl = null
      if (Object.prototype.hasOwnProperty.call(itemReview, "img")) {
        //Upload Image and retrieve URL
        const { createReadStream, filename, mimetype, encoding } = await itemReview.img

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

      let postId = args[0]
      let insertResult = await client.query(
        'INSERT INTO "ITEM_REVIEW"("FK_itemId","FK_postId","recommendReason","shortReview","score", "imgUrl") VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
        [itemReview.itemId, postId, itemReview.recommendReason, itemReview.shortReview, itemReview.score, imageUrl]
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
      let itemId = await client.query(
        'INSERT INTO "ITEM"("name","brand","originalPrice","salePrice","itemMajorType","itemMinorType","imageUrl","purchaseUrl") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
        [arg.name, arg.brand, arg.originalPrice, arg.salePrice, arg.itemMajorType, arg.itemMinorType, imageUrl, arg.purchaseUrl]
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
    if (Object.prototype.hasOwnProperty.call(arg, "img")) {
      const { createReadStream, filename, mimetype, encoding } = await arg.img

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
