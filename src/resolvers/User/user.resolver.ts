import * as AWS from "aws-sdk"
const { pool } = require("../../database/connectionPool")
const { S3 } = require("../../database/aws_s3")
var jwt = require("jsonwebtoken")

import * as ArgType from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { QueryArgInfo } from "./type/ArgType"
import { MutationArgInfo } from "./type/ArgType"
import { getFormatDate, getFormatHour, RunSingleSQL } from "../util/Util"

module.exports = {
  Mutation: {
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
    }
  },
  Query: {
    getUserInfo: async (parent: void, args: QueryArgInfo): Promise<[ReturnType.UserInfo]> => {
      let arg: ArgType.UserQuery = args.userOption
      let client
      try {
        client = await pool.connect()
      } catch (e) {
        throw new Error("[Error] Failed Connecting to DB")
      }

      try {
        let queryResult = await client.query('SELECT * FROM "USER_INFO" WHERE "FK_accountId"=' + arg.id)
        client.release()
        return queryResult.rows
      } catch (e) {
        client.release()
        console.log(e)
        throw new Error("[Error] Failed to fetch data from DB")
      }
    },

    getUserPickkChannel: async (parent: void, args: QueryArgInfo): Promise<ReturnType.UserInfo[]> => {
      let arg: ArgType.PickkChannelQuery = args.pickkChannelOption

      let limitSql = " LIMIT " + arg.filterCommon.first + " OFFSET " + arg.filterCommon.start
      let postSql =
        `WITH bbb as (SELECT "FK_channelId" FROM "CHANNEL_FOLLOWER" WHERE "FK_accountId"=${arg.userId}) 
      SELECT aaa.* from "USER_INFO" as aaa 
      INNER JOIN bbb on aaa."FK_accountId" = bbb."FK_channelId"` + limitSql

      let rows = await RunSingleSQL(postSql)
      return rows
    },

    getChannelPickkCount: async (parent: void, args: any): Promise<number> => {
      let rows = await RunSingleSQL(`SELECT COUNT(*) FROM "CHANNEL_FOLLOWER" WHERE "FK_channelId"=${args.channelId}`)
      return rows[0].count
    }
  }
}
