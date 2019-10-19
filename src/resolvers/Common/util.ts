import { RunSingleSQL } from "../Utils/promiseUtil"

function IncrementViewCountFunc(postType: string, postId: number): Promise<Boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      let query = `UPDATE "${postType}_POST" SET "viewCount" = "viewCount" + 1 WHERE id = ${postId}`
      let result = await RunSingleSQL(query)
      resolve()
    } catch (e) {
      console.log(`[Error] Failed to increase view count for ${postType} ${postId}`)
      console.log(e)
      reject()
    }
  })
}
