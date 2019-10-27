import { RunSingleSQL } from "../Utils/promiseUtil"
import { logWithDate } from "../Utils/stringUtil"

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
