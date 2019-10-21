import * as AWS from "aws-sdk"
const { pool } = require("../../database/connectionPool")
const { S3 } = require("../../database/aws_s3")
var jwt = require("jsonwebtoken")

import * as ArgType from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { QueryArgInfo } from "./type/ArgType"
import { MutationArgInfo } from "./type/ArgType"
import { RunSingleSQL, UploadImage, ExtractSelectionSet, ExtractFieldFromList } from "../Utils/promiseUtil"
import { GetFormatSql, ConvertListToOrderedPair } from "../Utils/stringUtil"
import { GraphQLResolveInfo } from "graphql"
import { GetUserInfoByIdList, GetChannelRankingId } from "./util"

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

    updateUserChannelInfo: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.UserChannelInfoInput = args.userChannelInfo
      try {
        let setSql = ""
        let isFirst = true
        if (Object.prototype.hasOwnProperty.call(arg, "channel_titleImg")) {
          let imgUrl = await UploadImage(arg.channel_titleImg)
          setSql += `"channel_titleImgUrl"='${imgUrl}'`
          isFirst = false
        }

        if (Object.prototype.hasOwnProperty.call(arg, "channel_snsUrl")) {
          if (!isFirst) setSql += ", "
          isFirst = false
          setSql += `"channel_snsUrl"='${arg.channel_snsUrl}'`
        }

        if (Object.prototype.hasOwnProperty.call(arg, "channel_description")) {
          if (!isFirst) setSql += ", "
          isFirst = false
          setSql += `"channel_description"='${arg.channel_description}'`
        }

        await RunSingleSQL(`
          UPDATE "USER_INFO" SET
          ${setSql}
          WHERE "FK_accountId"=${arg.id}
        `)
        return true
      } catch (e) {
        console.log("[Error] Failed to update user channel info")
        console.log(e)
        return false
      }
    },

    updateUserInfo: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
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
            `UPDATE "USER_INFO" SET
            "name" = '${arg.name}',
            "email" = '${arg.email}',
            "age" = ${arg.age},
            "height" = ${arg.height},
            "weight" = ${arg.weight},
            "profileImgUrl"='${profileImgUrl}',
            "phoneNum"='${arg.phoneNum}',
            "address"='${arg.address}'
            WHERE "FK_accountId" = ${arg.id}
            `
          )
        } else {
          qResult = await RunSingleSQL(
            `UPDATE "USER_INFO" SET
            "name" = '${arg.name}',
            "email" = '${arg.email}',
            "age" = ${arg.age},
            "height" = ${arg.height},
            "weight" = ${arg.weight},
            "phoneNum"='${arg.phoneNum}',
            "address"='${arg.address}'
            WHERE "FK_accountId" = ${arg.id}
            `
          )
        }
        console.log(`User Info for User ${arg.id} updated`)
        return true
      } catch (e) {
        console.log("[Error] Failed to update USER_INFO")
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
        let requestSql = UserInfoSelectionField(info)
        let result: ReturnType.UserInfo[] = await GetUserInfoByIdList([arg.id], requestSql)
        console.log(`Retrieve UserInfo for ${arg.id}`)
        return result[0]
      } catch (e) {
        console.log("[Error] Failed to fetch UserInfo from DB")
        console.log(e)
        throw new Error("[Error] Failed to fetch UserInfo from DB")
      }
    },

    getUserPickkChannel: async (parent: void, args: QueryArgInfo, ctx: any, info: GraphQLResolveInfo): Promise<ReturnType.UserInfo[]> => {
      let arg: ArgType.PickkChannelQuery = args.pickkChannelOption
      try {
        let formatSql = GetFormatSql(arg)
        let postSql = `SELECT "FK_channelId" FROM "CHANNEL_FOLLOWER" WHERE "FK_accountId"=${arg.userId}`
        let followingChannelList = await RunSingleSQL(postSql)
        if (followingChannelList.length == 0) return []

        let channelIdList = ExtractFieldFromList(followingChannelList, "FK_channelId")
        let requestSql = UserInfoSelectionField(info)
        let final_result = await GetUserInfoByIdList(channelIdList, requestSql, formatSql)
        return final_result
      } catch (e) {
        console.log("[Error] Failed to fetch Picked UserInfo from DB")
        console.log(e)
        throw new Error("[Error] Failed to fetch UserInfo from DB")
      }
    },

    getChannelRanking: async (parent: void, args: QueryArgInfo, ctx: any, info: GraphQLResolveInfo): Promise<ReturnType.UserInfo[]> => {
      try {
        let idList = await GetChannelRankingId()
        let orderSql = `
        JOIN (
          VALUES
          ${ConvertListToOrderedPair(idList)}
        ) AS x (id,ordering) ON user_info."FK_accountId" = x.id
        order by x.ordering
        `
        let userList = await GetUserInfoByIdList(idList, "", orderSql)
        console.log("CHANNEL RANK FETCH DONE")
        return userList
      } catch (e) {
        console.log("[Error] Faield to load Channel Ranking")
        console.log(e)
        throw new Error("[Error] Faield to load Channel Ranking")
      }
    }
  }
}

function UserInfoSelectionField(info: GraphQLResolveInfo) {
  let result = ""
  try {
    let selectionSet: string[] = ExtractSelectionSet(info.fieldNodes[0])
    if (selectionSet.includes("channel_pickCount")) {
      result += `
      ,
      COALESCE((
        SELECT COUNT(*)
        FROM "CHANNEL_FOLLOWER" follower WHERE follower."FK_channelId"=user_info."FK_accountId"
      ),0) as "channel_pickCount"
      `
    }

    if (selectionSet.includes("channel_totalViewCount")) {
      result += `
      ,
      COALESCE((
        SELECT SUM(post."viewCount")
        FROM "RECOMMEND_POST" post WHERE post."FK_accountId"=user_info."FK_accountId"
        GROUP BY post."FK_accountId"
      ),0) as "channel_totalViewCount"
      `
    }
    return result
  } catch (e) {
    console.log(e)
  }
}
