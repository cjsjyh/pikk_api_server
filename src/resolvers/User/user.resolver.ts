var jwt = require("jsonwebtoken")

import * as ArgType from "./type/ArgType"
import * as ReturnType from "./type/ReturnType"
import { QueryArgInfo } from "./type/ArgType"
import { MutationArgInfo } from "./type/ArgType"
import { RunSingleSQL, ExtractSelectionSet, ExtractFieldFromList } from "../Utils/promiseUtil"
import { GetFormatSql, ConvertListToOrderedPair, InsertImageIntoDeleteQueue, IsNewImage } from "../Utils/stringUtil"
import { GraphQLResolveInfo } from "graphql"
import { GetUserInfoByIdList, GetChannelRankingId } from "./util"
import { ValidateUser } from "../Utils/securityUtil"
import { InsertImageIntoTable } from "../Common/util"
var logger = require("../../tools/logger")

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
          await RunSingleSQL(`UPDATE "USER_CONFIDENTIAL" SET "lastLogin" = NOW() WHERE id=${userAccount.id}`)
          queryResult = await RunSingleSQL(`SELECT * FROM "USER_INFO" WHERE "FK_accountId"=${userAccount.id}`)
          //If user didn't insert user info yet
          if (queryResult.length == 0) userAccount.isNewUser = true
          else {
            userAccount.isNewUser = false
            userAccount.name = queryResult[0].name
            userAccount.profileImageUrl = queryResult[0].profileImgUrl
            userAccount.rank = queryResult[0].rank
          }
          userAccount.token = jwt.sign({ id: userAccount.id }, process.env.PICKK_SECRET_KEY)
        } else {
          userAccount = queryResult[0]
          userAccount.isNewUser = true
          userAccount.token = jwt.sign({ id: userAccount.id }, process.env.PICKK_SECRET_KEY)
        }
        logger.info(`User ${userAccount.id} Created`)
        return userAccount
      } catch (e) {
        logger.warn("Failed to create User")
        logger.error(e.stack)
        throw new Error("[Error] Failed to create User")
      }
    },

    createUserInfo: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.UserInfoInput = args.userInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)
      //Make UserCredential
      try {
        let qResult
        if (arg.profileImageUrl == undefined) arg.profileImageUrl = null
        qResult = await RunSingleSQL(
          'INSERT INTO "USER_INFO"("FK_accountId","name","email","age","height","weight","profileImgUrl","phoneNum","address") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
          [arg.accountId, arg.name, arg.email, arg.age, arg.height, arg.weight, arg.profileImageUrl, arg.phoneNum, arg.address]
        )

        logger.info(`User Info for User ${arg.accountId} created`)
        return true
      } catch (e) {
        logger.warn("Failed to Insert into USER_INFO")
        logger.error(e.stack)
        throw new Error("Failed to Insert into USER_INFO")
      }
    },

    updateUserChannelInfo: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.UserChannelInfoInput = args.userChannelInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)

      try {
        let setSql = ""
        let isFirst = true
        let deleteSql = ""
        if (Object.prototype.hasOwnProperty.call(arg, "channel_titleImageUrl")) {
          if (IsNewImage(arg.channel_titleImageUrl))
            deleteSql = InsertImageIntoDeleteQueue("USER_INFO", "channel_titleImgUrl", "FK_accountId", [arg.accountId])
          setSql += `"channel_titleImgUrl"='${arg.channel_titleImageUrl}'`
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
          ${deleteSql}
          UPDATE "USER_INFO" SET
          ${setSql}
          WHERE "FK_accountId"=${arg.accountId}
        `)
        logger.info(`User Channel Info Updated! id ${arg.accountId}`)
        return true
      } catch (e) {
        logger.warn("Failed to update user channel info")
        logger.error(e.stack)
        throw new Error("Failed to update user channel info")
      }
    },

    updateUserInfo: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      let arg: ArgType.UserEditInfoInput = args.userEditInfo
      if (!ValidateUser(ctx, arg.accountId)) throw new Error(`[Error] Unauthorized User`)
      //Make UserCredential
      try {
        let querySql = await GetUpdateUserInfoSql(arg)

        let qResult = await RunSingleSQL(querySql)
        logger.info(`User Info for User ${arg.accountId} updated`)
        return true
      } catch (e) {
        logger.warn("Failed to update USER_INFO")
        logger.error(e.stack)
        throw new Error("Failed to update USER_INFO")
      }
    },

    isDuplicateName: async (parent: void, args: any): Promise<Boolean> => {
      try {
        let query = `SELECT * FROM "USER_INFO" WHERE name='${args.name}'`
        let result = await RunSingleSQL(query)
        logger.info(`Checked DuplicateName ${args.name}`)

        if (result.length != 0) return true
        return false
      } catch (e) {
        logger.warn(`Failed to check Duplicate for ${args.name}`)
        logger.error(e.stack)
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
        logger.info(`Retrieve UserInfo for ${arg.id}`)
        return result[0]
      } catch (e) {
        logger.warn("Failed to fetch UserInfo from DB")
        logger.error(e.stack)
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
        logger.info(`User Pick Channel called id ${arg.userId}`)
        return final_result
      } catch (e) {
        logger.warn("Failed to fetch Picked UserInfo from DB")
        logger.error(e.stack)
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
        logger.info("CHANNEL RANK FETCH DONE")
        return userList
      } catch (e) {
        logger.warn("Faield to load Channel Ranking")
        logger.error(e.stack)
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
    logger.error(e.stack)
  }
}

async function GetUpdateUserInfoSql(arg: ArgType.UserEditInfoInput): Promise<string> {
  let resultSql = `UPDATE "USER_INFO" SET `
  let isMultiple = false
  let deleteSql = ""

  if (Object.prototype.hasOwnProperty.call(arg, "profileImageUrl")) {
    if (arg.profileImageUrl != null) {
      try {
        if (IsNewImage(arg.profileImageUrl)) {
          deleteSql = InsertImageIntoDeleteQueue("USER_INFO", "profileImgUrl", "FK_accountId", [arg.accountId])
        }
        resultSql += `"profileImgUrl"='${arg.profileImageUrl}'`
        isMultiple = true
      } catch (e) {
        throw new Error("[Error] ProfileImage Upload Failed!")
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(arg, "name")) {
    if (isMultiple) resultSql += " ,"
    resultSql += `"name" = '${arg.name}'`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(arg, "email")) {
    if (isMultiple) resultSql += " ,"
    resultSql += `"email" = '${arg.email}'`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(arg, "age")) {
    if (isMultiple) resultSql += " ,"
    resultSql += `"age" = ${arg.age}`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(arg, "height")) {
    if (isMultiple) resultSql += " ,"
    resultSql += `"height" = ${arg.height}`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(arg, "weight")) {
    if (isMultiple) resultSql += " ,"
    resultSql += `"weight" = ${arg.weight}`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(arg, "phoneNum")) {
    if (isMultiple) resultSql += " ,"
    resultSql += `"phoneNum"='${arg.phoneNum}'`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(arg, "address")) {
    if (isMultiple) resultSql += " ,"
    resultSql += `"address"='${arg.address}'`
    isMultiple = true
  }

  resultSql = deleteSql + " " + resultSql
  resultSql += `
  WHERE "FK_accountId" = ${arg.accountId}`
  return resultSql
}
