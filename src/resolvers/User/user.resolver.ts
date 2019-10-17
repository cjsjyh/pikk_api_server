import * as AWS from "aws-sdk"
const { pool } = require("../../database/connectionPool")
const { S3 } = require("../../database/aws_s3")
var jwt = require("jsonwebtoken")

import * as ArgType from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { QueryArgInfo } from "./type/ArgType"
import { MutationArgInfo } from "./type/ArgType"
import { RunSingleSQL, UploadImage, ExtractSelectionSet, ExtractFieldFromList } from "../Utils/promiseUtil"
import { GetFormatSql } from "../Utils/stringUtil"
import { GraphQLResolveInfo } from "graphql"
import { GetUserInfo } from "./util"

module.exports = {
  Mutation: {
    createUser: async (parent: void, args: MutationArgInfo, ctx: any): Promise<ReturnType.UserCredentialInfo> => {
      let arg: ArgType.UserCredentialInput = args.userAccountInfo
      //Make UserCredential
      try {
        let userAccount: ReturnType.UserCredentialInfo
        let queryResult = await RunSingleSQL(
          `INSERT INTO "USER_CONFIDENTIAL" ("providerType", "providerId") VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING id`,
          [arg.providerType, arg.providerId]
        )
        if (queryResult.length == 0) {
          queryResult = await RunSingleSQL(
            `SELECT id FROM "USER_CONFIDENTIAL" where "providerType"='${arg.providerType}' and "providerId"='${arg.providerId}'`
          )
          userAccount = queryResult[0]
          queryResult = await RunSingleSQL(`SELECT * FROM "USER_INFO" WHERE "FK_accountId"=${userAccount.id}`)
          //If user didn't insert user info yet
          if (queryResult.length == 0) userAccount.isNewUser = true
          else {
            userAccount.isNewUser = false
            userAccount.name = queryResult[0].name
            userAccount.profileImgUrl = queryResult[0].profileImgUrl
            userAccount.rank = queryResult[0].rank
          }
          userAccount.token = jwt.sign({ id: userAccount.id }, process.env.PICKK_SECRET_KEY)
        } else {
          userAccount = queryResult[0]
          userAccount.isNewUser = true
          userAccount.token = jwt.sign({ id: userAccount.id }, process.env.PICKK_SECRET_KEY)
        }
        console.log(`User ${userAccount.id} Created`)
        return userAccount
      } catch (e) {
        console.log(e)
        throw new Error("[Error] Failed to create User")
      }
    },

    createUserInfo: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.UserInfoInput = args.userInfo

      //Make UserCredential
      try {
        let profileImgUrl = null
        if (Object.prototype.hasOwnProperty.call(arg, "profileImg")) {
          profileImgUrl = await UploadImage(arg.profileImg)
          if (profileImgUrl == null) {
            throw new Error("[Error] Image Upload Failed!")
          }
        }

        let qResult
        if (profileImgUrl != null) {
          qResult = await RunSingleSQL(
            'INSERT INTO "USER_INFO"("FK_accountId","name","email","age","height","weight","profileImgUrl","phoneNum","address") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
            [arg.id, arg.name, arg.email, arg.age, arg.height, arg.weight, profileImgUrl, arg.phoneNum, arg.address]
          )
        } else {
          qResult = await RunSingleSQL(
            'INSERT INTO "USER_INFO"("FK_accountId","name","email","age","height","weight","phoneNum","address") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
            [arg.id, arg.name, arg.email, arg.age, arg.height, arg.weight, arg.phoneNum, arg.address]
          )
        }
        console.log(`User Info for User ${arg.id} created`)
        return true
      } catch (e) {
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
    getUserInfo: async (parent: void, args: QueryArgInfo, ctx: any, info: GraphQLResolveInfo): Promise<ReturnType.UserInfo> => {
      let arg: ArgType.UserQuery = args.userOption
      try {
        let result: ReturnType.UserInfo[] = await GetUserInfo([arg.id])
        console.log(`Retrieve UserInfo for ${arg.id}`)
        return result[0]
      } catch (e) {
        console.log("[Error] Failed to fetch UserInfo from DB")
        console.log(e)
        throw new Error("[Error] Failed to fetch UserInfo from DB")
      }
    },

    getUserPickkChannel: async (parent: void, args: QueryArgInfo): Promise<ReturnType.UserInfo[]> => {
      let arg: ArgType.PickkChannelQuery = args.pickkChannelOption

      let formatSql = GetFormatSql(arg)
      let tempSql = `SELECT "FK_channelId" FROM "CHANNEL_FOLLOWER" WHERE "FK_accountId"=${arg.userId}`
      let postSql = `WITH follower as (SELECT "FK_channelId" FROM "CHANNEL_FOLLOWER" WHERE "FK_accountId"=${arg.userId}) 
        SELECT 
          channel.*,
          (
            SELECT COUNT(*) as "channel_pickCount" 
            FROM "CHANNEL_FOLLOWER" fol WHERE fol."FK_channelId"=follower."FK_channelId"
          )
        FROM "USER_INFO" as channel 
        INNER JOIN follower on channel."FK_accountId" = follower."FK_channelId" 
        ${formatSql}`

      let followingChannelList = await RunSingleSQL(tempSql)
      let channelIdList = ExtractFieldFromList(followingChannelList, "FK_channelId")
      let final_result = await GetUserInfo(channelIdList)
      return final_result
    }
  }
}
