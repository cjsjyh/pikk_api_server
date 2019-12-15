import { RunSingleSQL } from "./promiseUtil"

export function ValidateUser(ctx: any, requestId: number): boolean {
  if (process.env.MODE != "DEPLOY") {
    return true
  }
  if (!ctx.IsVerified) return false
  if (ctx.userId != requestId) return false
  return true
}

export async function CheckWriter(tableName: string, contentId: number, accountId: number) {
  if (process.env.MODE != "DEPLOY") {
    return true
  }

  //Check if the user is the writer
  let checkWriter = await RunSingleSQL(
    `SELECT id FROM "${tableName}" WHERE id=${contentId} AND "FK_accountId"=${accountId}`
  )
  if (checkWriter.length == 0) {
    //Check if the user is the admin
    let userRank = await RunSingleSQL(
      `SELECT rank FROM "USER_INFO" WHERE "FK_accountId"=${accountId}`
    )
    if (userRank[0] == "9999") return true
    return false
  }
  return true
}
