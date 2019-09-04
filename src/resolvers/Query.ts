const { pool } = require("../database/connectionPool")
import * as ArgType from "./type/ArgType"
import { QueryArgInfo } from "./type/ArgType"
import * as CustomType from "./type/ReturnType"
import * as CustomEnum from "./type/enum"
import { QueryResult } from "pg"
import { GraphQLResolveInfo } from "graphql"
import { resolve } from "dns"
//import { ArgInfo } from "./QueryType"

module.exports = {
  allItems: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<[CustomType.ItemInfo]> => {
    let arg: ArgType.ItemQuery = args.itemOption
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    let sortSql: string
    sortSql = " ORDER BY " + arg.sortBy + " " + arg.filter.sort
    let limitSql: string
    limitSql = " LIMIT " + arg.filter.first + " OFFSET " + arg.filter.start

    try {
      let queryResult = await client.query('SELECT * FROM "ITEM"' + sortSql + limitSql)
      client.release()
      return queryResult.rows
    } catch (e) {
      client.release()
      console.log(e)
      throw new Error("[Error] Failed to fetch data from DB")
    }
  },

  allCommunityPosts: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<[CustomType.CommunityPostInfo]> => {
    let arg: ArgType.CommunityPostQuery = args.communityPostOption
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    let sortSql = " ORDER BY " + arg.sortBy + " " + arg.filter.sort
    let limitSql = " LIMIT " + arg.filter.first + " OFFSET " + arg.filter.start

    let postResult, imgResult: QueryResult
    try {
      postResult = await client.query('SELECT * FROM "COMMUNITY_POST"' + sortSql + limitSql)

      let PromiseResult: any = await Promise.all([
        SequentialPromiseValue(postResult.rows, GetCommunityPostImage),
        SequentialPromiseValue(postResult.rows, GetUserInfo)
      ])
      let imgResult: CustomType.ImageInfo[][] = PromiseResult[0]
      let userResult: CustomType.UserInfo[] = PromiseResult[1]

      postResult.rows.forEach((item: CustomType.CommunityPostInfo, index: number) => {
        item.accountId = item.FK_accountId
        item.channelId = item.FK_channelId
        item.name = userResult[index].name
        item.profileImgUrl = userResult[index].profileImgUrl
        item.imageUrl = new Array()
        imgResult[index].forEach(image => {
          item.imageUrl.push(image.imageUrl)
        })
      })

      return postResult.rows
    } catch (e) {
      throw new Error("[Error] Failed to fetch user data from DB")
    }
  },

  allRecommendPosts: async (parent: void, args: QueryArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<Boolean> => {
    let arg: ArgType.RecommendPostQuery = args.recommendPostOption
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    let sortSql = " ORDER BY " + arg.sortBy + " " + arg.filter.sort
    let limitSql = " LIMIT " + arg.filter.first + " OFFSET " + arg.filter.start

    let postResult, imgResult: QueryResult
    try {
      postResult = await client.query('SELECT * FROM "RECOMMEND_POST"' + sortSql + limitSql)

      let PromiseResult: any = await Promise.all([
        SequentialPromiseValue(postResult.rows, GetCommunityPostImage),
        SequentialPromiseValue(postResult.rows, GetUserInfo)
      ])
      let imgResult: CustomType.ImageInfo[][] = PromiseResult[0]
      let userResult: CustomType.UserInfo[] = PromiseResult[1]

      postResult.rows.forEach((item: CustomType.RecommendPostInfo, index: number) => {
        item.accountId = item.FK_accountId
        item.name = userResult[index].name
        item.profileImgUrl = userResult[index].profileImgUrl
        item.imageUrl = new Array()
        imgResult[index].forEach(image => {
          item.imageUrl.push(image.imageUrl)
        })
      })

      return postResult.rows
    } catch (e) {
      throw new Error("[Error] Failed to fetch user data from DB")
    }
  },

  getUser: async (parent: void, args: QueryArgInfo): Promise<[CustomType.UserInfo]> => {
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

      console.log(queryResult.rows)
      return queryResult.rows
    } catch (e) {
      client.release()
      console.log(e)
      throw new Error("[Error] Failed to fetch data from DB")
    }
  }
}

function GetUserInfo(postInfo: any): Promise<CustomType.UserInfo> {
  return new Promise(async (resolve, reject) => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    try {
      let queryResult = await client.query('SELECT * FROM "USER_INFO" where "FK_accountId"=$1', [postInfo.FK_accountId])
      client.release()
      resolve(queryResult.rows[0])
    } catch (e) {
      client.release()
      reject(e)
    }
  })
}

function GetCommunityPostImage(postInfo: CustomType.CommunityPostInfo): Promise<QueryResult> {
  return new Promise(async (resolve, reject) => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    try {
      let queryResult = await client.query('SELECT "imageUrl" FROM "COMMUNITY_POST_IMAGE" where "FK_postId"=$1', [postInfo.id])
      client.release()
      console.log(queryResult.rows)
      resolve(queryResult.rows)
    } catch (e) {
      client.release()
      reject(e)
    }
  })
}

function GetRecommendPostReview<T>(sql: string, parameters: Array<T>): Promise<QueryResult> {
  return new Promise(async (resolve, reject) => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    try {
      let queryResult = await client.query(sql, parameters)
      client.release()
      resolve(queryResult.rows)
    } catch (e) {
      client.release()
      reject(e)
    }
  })
}

async function SequentialPromiseValue<T>(arr: T[], func: Function): Promise<Array<T>> {
  let resultArr = new Array<T>(arr.length)
  await Promise.all(
    arr.map((item: any, index: number) => {
      return new Promise((resolve, reject) => {
        func(item, index).then((result: any) => {
          resultArr[index] = result
          resolve()
        })
      })
    })
  )
  return resultArr
}

async function SequentialPromise<T>(arr: Promise<{}>[]): Promise<Array<T>> {
  let resultArr = new Array<any>(arr.length)
  await Promise.all(
    arr.map((item: Promise<{}>, index: number) => {
      return new Promise((resolve, reject) => {
        item.then((result: any) => {
          resultArr[index] = result
          resolve()
        })
      })
    })
  )
  return resultArr
}
