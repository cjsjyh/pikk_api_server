const { pool } = require("../../database/connectionPool")
import { ExtractFieldFromList, RunSingleSQL } from "../Utils/promiseUtil"
import { ConvertListToString } from "../Utils/stringUtil"
import * as ReturnType from "./type/ReturnType"

//fetch multiple user info
export async function GetUserInfoByIdList(
  userIdList: any,
  requestSql: string = "",
  formatSql: string = ""
): Promise<ReturnType.UserInfo[]> {
  return new Promise(async (resolve, reject) => {
    try {
      let querySql = `
      WITH user_info as 
      (
        SELECT * FROM "USER_INFO"
        WHERE "USER_INFO"."FK_accountId" IN (${ConvertListToString(userIdList)})
      )
      SELECT 
        user_info.* ${requestSql}
      FROM user_info
      ${formatSql}
      `
      let queryResult = await RunSingleSQL(querySql)
      queryResult.forEach(element => {
        UserMatchGraphQL(element)
      })
      resolve(queryResult)
    } catch (e) {
      reject(e)
    }
  })
}

export async function FetchUserForReview(reviewInfo: any): Promise<{}> {
  return new Promise(async (resolve, reject) => {
    try {
      let queryResult = await RunSingleSQL(
        `SELECT "FK_accountId" FROM "RECOMMEND_POST" WHERE id = ${reviewInfo.FK_postId}`
      )
      queryResult = await GetUserInfoByIdList(
        ExtractFieldFromList(queryResult, "FK_accountId"),
        `,
        COALESCE((
          SELECT COUNT(*)
          FROM "CHANNEL_FOLLOWER" follower WHERE follower."FK_channelId"=user_info."FK_accountId"
        ),0) as "channel_pickCount"
        `
      )
      UserMatchGraphQL(queryResult[0])
      reviewInfo.userInfo = queryResult[0]
      resolve()
    } catch (e) {
      reject(e)
    }
  })
}

export async function GetChannelRankingId(): Promise<number[]> {
  let querySql = `
  WITH users as
  (
    SELECT 
      user_info.id,
      user_info."FK_accountId",
      user_info.name,
      COUNT(channel_follower."FK_channelId") as channel_follower_count
    FROM "USER_INFO" user_info
    LEFT JOIN "CHANNEL_FOLLOWER" channel_follower ON channel_follower."FK_channelId" = user_info."FK_accountId"
    GROUP BY channel_follower."FK_channelId", user_info.id
  ),
  post_review as
  (
    SELECT 
      post.id,
      post."FK_accountId",
      post."viewCount",
      SUM(review."purchaseCount") as purchase_count,
      SUM(review."urlClickCount") as urlclick_count
    FROM "RECOMMEND_POST" post
    INNER JOIN "ITEM_REVIEW" review ON post.id = review."FK_postId"
    GROUP BY review."FK_postId", post.id
  ),
  post_follower_count as
  (
    SELECT
      post_review.id,
      COUNT(post_follower."FK_postId") as post_follower_count
    FROM post_review
    LEFT JOIN "RECOMMEND_POST_FOLLOWER" post_follower ON post_follower."FK_postId" = post_review.id
    GROUP BY post_follower."FK_postId", post_review.id
  ),
  post_follower_combined as
  (
    SELECT
      post_review.*,
      post_follower_count.post_follower_count
    FROM post_review
    INNER JOIN post_follower_count ON post_review.id = post_follower_count.id
  )
  SELECT 
    users."FK_accountId",
    (
      COALESCE(users.channel_follower_count,0) +
      COALESCE(SUM(post_follower_combined.post_follower_count),0)+
      COALESCE(SUM(post_follower_combined.purchase_count),0) +
      COALESCE(SUM(post_follower_combined.urlclick_count),0) +
      COALESCE(SUM(post_follower_combined."viewCount"),0) +
      COALESCE(COUNT(post_follower_combined.id),0)
    ) as total_score
  FROM users
  LEFT JOIN post_follower_combined ON users."FK_accountId"=post_follower_combined."FK_accountId"
  GROUP BY users."FK_accountId", users.channel_follower_count, post_follower_combined."FK_accountId"
  ORDER BY total_score DESC LIMIT 100
  `

  let userIdList = await RunSingleSQL(querySql)
  let idList = ExtractFieldFromList(userIdList, "FK_accountId")
  return idList
}

export async function FetchUserForCommunityPost(postInfo: any): Promise<ReturnType.UserInfo> {
  let queryResult = await GetUserInfoByIdList([postInfo.FK_accountId])
  return queryResult[0]
}

function UserMatchGraphQL(obj: any) {
  obj.id = obj.FK_accountId
  obj.profileImageUrl = obj.profileImgUrl
  obj.channel_titleImageUrl = obj.channel_titleImgUrl
}
