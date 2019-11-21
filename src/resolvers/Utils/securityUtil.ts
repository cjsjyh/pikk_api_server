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
  let checkWriter = await RunSingleSQL(`SELECT id FROM "${tableName}" WHERE id=${contentId} AND "FK_accountId"=${accountId}`)
  if (checkWriter.length == 0) return false
  return true
}
