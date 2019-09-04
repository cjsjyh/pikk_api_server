const { pool } = require("../database/connectionPool")
import * as CustomType from "./Type"
import * as CustomEnum from "./enum"
import { ArgInfo } from "./Type"
import { QueryResult } from "pg"
import { GraphQLResolveInfo } from "graphql"
import { resolve } from "dns"
//import { ArgInfo } from "./QueryType"

module.exports = {
  allItems: async (parent: void, args: ArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<[CustomType.ItemInfo]> => {
    let arg: CustomType.ItemQuery = args.itemOption
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

  allCommunityPosts: async (parent: void, args: ArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<[CustomType.PostInfo]> => {
    let arg: CustomType.CommunityPostQuery = args.communityPostOption
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

      let imgResult: CustomType.ImageInfo[][] = await SequentialPromise(postResult.rows, GetPostImage)
      let userResult: CustomType.UserInfo[] = await SequentialPromise(postResult.rows, GetUserInfo)

      postResult.rows.forEach((item: CustomType.PostInfo, index: number) => {
        item.accountId = item.FK_accountId
        item.name = userResult[index].name
        item.profileImgUrl = userResult[index].profileImgUrl
        item.imageUrl = new Array()
        imgResult[index].forEach(image => {
          item.imageUrl.push(image.imageUrl)
        })
      })

      console.log(postResult.rows)
      return postResult.rows
    } catch (e) {
      throw new Error("[Error] Failed to fetch user data from DB")
    }
  },
  /*
  allRecommendPosts: async (parent: void, args: ArgInfo, ctx: void, info: GraphQLResolveInfo): Promise<Boolean> => {
    let arg: CustomType.RecommendPostQuery = args.recommendPostOption
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    return true
  },
  */
  getUser: async (parent: void, args: ArgInfo): Promise<[CustomType.UserInfo]> => {
    let arg: CustomType.UserQuery = args.userOption
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

function GetUserInfo(postInfo: CustomType.PostInfo, index: number): Promise<CustomType.UserInfo> {
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

function GetPostImage(postInfo: CustomType.PostInfo): Promise<QueryResult> {
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
      resolve(queryResult.rows)
    } catch (e) {
      client.release()
      reject(e)
    }
  })
}

async function SequentialPromise<T>(arr: T[], func: Function): Promise<Array<T>> {
  let resultArr = new Array<T>(arr.length)
  await Promise.all(
    arr.map((item: T, index: number) => {
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
