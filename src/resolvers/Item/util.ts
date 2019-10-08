const { pool } = require("../../database/connectionPool")
import { UploadImage } from "../Util/util"
const { S3 } = require("../../database/aws_s3")
import * as AWS from "aws-sdk"

export function InsertItem(argReview: any): Promise<{}> {
  return new Promise(async (resolve, reject) => {
    let client
    try {
      client = await pool.connect()
    } catch (e) {
      console.log("[Error] Failed Connecting to DB")
      return false
    }

    let arg = argReview.item

    let imageUrl = null
    if (Object.prototype.hasOwnProperty.call(arg, "itemImg")) {
      //Upload Image and retrieve URL
      imageUrl = await UploadImage(arg.itemImg)
      if (imageUrl == null) reject()
    }

    try {
      let itemId = await client.query(
        'INSERT INTO "ITEM"("name","brand","originalPrice","salePrice","itemMajorType","itemMinorType","imageUrl","purchaseUrl") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
        [arg.name, arg.brand, arg.originalPrice, arg.salePrice, arg.itemMajorType, arg.itemMinorType, imageUrl, arg.purchaseUrl]
      )
      client.release()
      console.log(itemId.rows[0].id)
      argReview.itemId = itemId.rows[0].id
      resolve()
    } catch (e) {
      client.release()
      console.log("[Error] Failed to Insert into ITEM")
      console.log(e)
      reject()
    }
  })
}
