const { pool } = require("../database/connectionPool")
import * as CustomType from "./Type"
import * as CustomEnum from "./enum"
import { ArgInfo } from "./Type"
import { QueryResult } from "pg"
//import { ArgInfo } from "./QueryType"

module.exports = {
  allItems: async (parent: void, args: ArgInfo): Promise<[CustomType.ItemInfo]> => {
    let arg: CustomType.ItemQuery = args.itemOption
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    let sortSql: string
    sortSql = " ORDER BY " + arg.sortBy + " " + arg.sort
    let limitSql: string
    limitSql = " LIMIT " + arg.first + " OFFSET " + arg.start

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

  getUser: async (parent: void, args: ArgInfo): Promise<[CustomType.UserInfo]> => {
    let arg: CustomType.UserQuery = args.userOption
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      throw new Error("[Error] Failed Connecting to DB")
    }

    try {
      let queryResult = await client.query(
        'SELECT * FROM "USER_INFO" WHERE "FK_accountId"=' + arg.id
      )
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
/*
class SQLConverter {
  constructor(queryParam, FieldEnum) {}
}
*/
