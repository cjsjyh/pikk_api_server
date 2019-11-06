import { RunSingleSQL, DeployImage } from "../Utils/promiseUtil"
import { logWithDate, IsNewImage } from "../Utils/stringUtil"
import { CommunityPostEditImageInfo } from "../CommunityPost/type/ArgType"
import { ItemReviewImgEditInfoInput } from "../Review/type/ArgType"

export function IncrementViewCountFunc(postType: string, postId: number): Promise<Boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      let query = `UPDATE "${postType}_POST" SET "viewCount" = "viewCount" + 1 WHERE id = ${postId}`
      let result = await RunSingleSQL(query)
      resolve()
    } catch (e) {
      logWithDate(`[Error] Failed to increase view count for ${postType} ${postId}`)
      logWithDate(e)
      reject()
    }
  })
}

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

export async function EditImageUrlInTable(
  image: ItemReviewImgEditInfoInput | CommunityPostEditImageInfo,
  tableName: string,
  foreignKeyName: string,
  foreignKeyId: number,
  index: number
): Promise<boolean> {
  try {
    //Edit exsiting image
    if (Object.prototype.hasOwnProperty.call(image, "id") && image.id != null) {
      let deployUrl = image.imageUrl
      if (IsNewImage(image.imageUrl)) deployUrl = await DeployImage(deployUrl)
      await RunSingleSQL(`UPDATE "${tableName}" SET "imageUrl"='${deployUrl}', "order"=${index} WHERE id=${image.id}`)
    }
    //Insert new image
    else {
      let deployUrl = await DeployImage(image.imageUrl)
      await InsertImageIntoTable("", tableName, foreignKeyName, foreignKeyId, deployUrl, index)
    }
    return true
  } catch (e) {
    logWithDate("[Error] Failed to Edit Review Image")
    logWithDate(e)
    throw new Error(e)
  }
}
