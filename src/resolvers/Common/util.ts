import { RunSingleSQL, DeployImageBy4Versions } from "../Utils/promiseUtil"
import { IsNewImage, InsertImageIntoDeleteQueue } from "../Utils/stringUtil"
import { ItemReviewImgEditInfoInput } from "../Review/type/ArgType"
var logger = require("../../tools/logger")

//IncreaseViewFunction for other resolvers to call
export function IncreaseViewCountFunc(postType: string, postId: number): Promise<Boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      let query = `UPDATE "${postType}_POST" SET "viewCount" = "viewCount" + 1 WHERE id = ${postId}`
      let result = await RunSingleSQL(query)
      resolve()
    } catch (e) {
      logger.warn(`Failed to increase view count for ${postType} ${postId}`)
      logger.error(e.stack)
      reject()
    }
  })
}

//Insert image into tables with image url
export async function InsertImageIntoTable(
  multipleValues: string = "",
  tableName?: string,
  foreignKeyName?: string,
  foreignKeyId?: number,
  url?: string,
  order?: number
) {
  let querySql
  if (multipleValues == "")
    querySql = `INSERT INTO "${tableName}"("imageUrl","order", "${foreignKeyName}") VALUES ('${url}', ${order},${foreignKeyId})`
  else querySql = `INSERT INTO "${tableName}"("imageUrl","order", "${foreignKeyName}") VALUES ${multipleValues}`
  await RunSingleSQL(querySql)
}

//Edit image into tables with image url
export async function EditImageUrlInTable(
  image: ItemReviewImgEditInfoInput,
  tableName: string,
  foreignKeyName: string,
  foreignKeyId: number,
  index: number
): Promise<boolean> {
  try {
    //Edit exsiting image
    if (Object.prototype.hasOwnProperty.call(image, "id") && image.id != null) {
      let deployUrl = image.imageUrl
      let deleteSql = ""
      //If new image
      if (IsNewImage(image.imageUrl)) {
        //Add previous url into delete table
        deleteSql = InsertImageIntoDeleteQueue(tableName, "imageUrl", "id", [image.id])
        //deploy image and get imageUrl
        deployUrl = await DeployImageBy4Versions(deployUrl)
      }
      //Update image url
      await RunSingleSQL(`
      ${deleteSql}
      UPDATE "${tableName}" SET "imageUrl"='${deployUrl}', "order"=${index} WHERE id=${image.id}`)
    }
    //Insert new image
    else {
      let deployUrl = await DeployImageBy4Versions(image.imageUrl)
      await InsertImageIntoTable("", tableName, foreignKeyName, foreignKeyId, deployUrl, index)
    }
    return true
  } catch (e) {
    logger.warn("Failed to Edit Review Image")
    logger.error(e.stack)
    throw new Error(e)
  }
}
