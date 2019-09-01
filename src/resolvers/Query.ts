const { pool } = require("../database/connectionPool")
import * as CustomType from "./QueryType"
import {ItemInfo} from "./Type"
//import { ArgInfo } from "./QueryType"

module.exports = {
  helloWorld(parent: void, args: void): string {
    return `👋 Hello world! 👋`
  },

  allItems(parent: void, args: CustomType.QueryCommon): [ItemInfo!] {
    
  }
}
