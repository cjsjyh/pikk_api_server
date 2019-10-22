const { pool } = require("../../database/connectionPool")
const _ = require("lodash")

import * as ArgType from "./type/ArgType"
import * as PostReturnType from "./type/ReturnType"
import { GetUserInfoByIdList, FetchUserForCommunityPost } from "../User/util"
import { GetCommunityPostImage } from "./util"
import { QueryArgInfo } from "./type/ArgType"
import { MutationArgInfo } from "./type/ArgType"
import { GetPostFilterSql } from "./util"
import { SequentialPromiseValue, GetMetaData, RunSingleSQL, ExtractSelectionSet } from "../Utils/promiseUtil"
import { GetFormatSql } from "../Utils/stringUtil"

import { GraphQLResolveInfo } from "graphql"

module.exports = {
  Query: {
    allCommunityPosts: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<PostReturnType.CommunityPostInfo[]> => {
      let arg: ArgType.CommunityPostQuery = args.communityPostOption

      try {
        let filterSql: string = ""
        if (Object.prototype.hasOwnProperty.call(arg, "postFilter")) {
          filterSql = await GetPostFilterSql(arg.postFilter)
        }

        let formatSql = GetFormatSql(arg)
        let requestSql = CommunityPostSelectionField(info)
        let querySql = `
        WITH post as (SELECT * FROM "COMMUNITY_POST" ${filterSql} ${formatSql})
        SELECT 
          user_info."name",
          user_info."profileImgUrl",
          post.*
          ${requestSql}
        FROM post
        INNER JOIN "USER_INFO" user_info ON post."FK_accountId" = user_info."FK_accountId"
        `
        let postResult: PostReturnType.CommunityPostInfo[] = await RunSingleSQL(querySql)

        let imgResult = await SequentialPromiseValue(postResult, GetCommunityPostImage)

        postResult.forEach((post: PostReturnType.CommunityPostInfo, index: number) => {
          post.accountId = post.FK_accountId
          post.channelId = post.FK_channelId
          post.imageUrl = []
          imgResult[index].forEach(image => {
            post.imageUrl.push(image.imageUrl)
          })
        })
        return postResult
      } catch (e) {
        console.log(e)
        throw new Error("[Error] Failed to fetch community post from DB")
      }
    },

    _allCommunityPostsMetadata: async (parent: void, args: QueryArgInfo): Promise<number> => {
      return GetMetaData("COMMUNITY_POST")
    }
  },
  Mutation: {
    createCommunityPost: async (parent: void, args: MutationArgInfo, ctx: any): Promise<Boolean> => {
      if (!ctx.IsVerified) throw new Error("[Error] User not Logged In!")
      let arg: ArgType.CommunityPostInfoInput = args.communityPostInfo

      try {
        await RunSingleSQL(
          'INSERT INTO "COMMUNITY_POST"("FK_accountId","FK_channelId","title","content","postType","qnaType") VALUES ($1,$2,$3,$4,$5,$6)',
          [arg.accountId, arg.channelId, arg.title, arg.content, arg.postType, arg.qnaType]
        )
        console.log(`Community Post has been created by User ${arg.accountId}`)
        return true
      } catch (e) {
        console.log("[Error] Failed to Insert into COMMUNITY_POST")
        console.log(e)
        return false
      }
    },

    deleteCommunityPost: async (parent: void, args: any): Promise<Boolean> => {
      try {
        let query = `DELETE FROM "COMMUNITY_POST" WHERE id=${args.postId}`
        let result = await RunSingleSQL(query)
        return true
      } catch (e) {
        console.log(`[Error] Delete CommunityPost id: ${args.postId} Failed!`)
        console.log(e)
        throw new Error(`[Error] Delete CommunityPost id: ${args.postId} Failed!`)
      }
    }
  }
}

function CommunityPostSelectionField(info: GraphQLResolveInfo) {
  let result = ""
  try {
    let selectionSet: string[] = ExtractSelectionSet(info.fieldNodes[0])
    if (selectionSet.includes("commentCount")) {
      result += `
      ,
      COALESCE((
        SELECT COUNT(*) as "commentCount" 
        FROM "COMMUNITY_POST_COMMENT" comment WHERE comment."FK_postId"=post.id
      ),0)
      `
    }

    return result
  } catch (e) {
    console.log(e)
  }
}
