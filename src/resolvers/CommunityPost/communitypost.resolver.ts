const { pool } = require("../../database/connectionPool")
const _ = require("lodash")

import * as ArgType from "./type/ArgType"
import * as PostReturnType from "./type/ReturnType"
import * as CommentReturnType from "../Comment/type/ReturnType"
import * as UserReturnType from "../User/type/ReturnType"
import { GetUserInfo } from "../User/util"
import { GetCommunityPostImage } from "./util"
import { QueryArgInfo } from "./type/ArgType"
import { MutationArgInfo } from "./type/ArgType"
import { GetPostFilterSql } from "./util"
import { SequentialPromiseValue, GetMetaData, RunSingleSQL, GetFormatSql } from "../Utils/util"

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
        let querySql = 'SELECT * FROM "COMMUNITY_POST"' + filterSql + formatSql
        let commentSql = `WITH aaa AS (${querySql}) SELECT bbb."FK_postId" FROM "COMMUNITY_POST_COMMENT" AS bbb INNER JOIN aaa ON aaa.id = bbb."FK_postId"`

        let queryResult = await RunSingleSQL(querySql)
        let postResult: PostReturnType.CommunityPostInfo[] = queryResult

        queryResult = await RunSingleSQL(commentSql)
        let commentResult: CommentReturnType.CommentInfo[] = queryResult
        let commentResultGroup = _.countBy(commentResult, "FK_postId")

        let PromiseResult: any = await Promise.all([
          SequentialPromiseValue(postResult, GetCommunityPostImage),
          SequentialPromiseValue(postResult, GetUserInfo)
        ])
        let imgResult: PostReturnType.ImageInfo[][] = PromiseResult[0]
        let userResult: UserReturnType.UserInfo[] = PromiseResult[1]

        postResult.forEach((post: PostReturnType.CommunityPostInfo, index: number) => {
          if (Object.prototype.hasOwnProperty.call(commentResultGroup, String(post.id))) {
            post.commentCount = commentResultGroup[String(post.id)]
          } else {
            post.commentCount = 0
          }

          post.accountId = post.FK_accountId
          post.channelId = post.FK_channelId
          post.name = userResult[index].name
          post.profileImgUrl = userResult[index].profileImgUrl
          post.imageUrl = new Array()
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
      if (!ctx.IsVerified) throw new Error("USER NOT LOGGED IN!")
      let arg: ArgType.CommunityPostInfoInput = args.communityPostInfo

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
        console.log(query)
        return true
      } catch (e) {
        console.log(`[Error] Delete CommunityPost id: ${args.postId} Failed!`)
        console.log(e)
        throw new Error(`[Error] Delete CommunityPost id: ${args.postId} Failed!`)
      }
    }
  }
}
