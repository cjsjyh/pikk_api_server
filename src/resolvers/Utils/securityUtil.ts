export function ValidateUser(ctx: any, requestId: number): boolean {
  if (process.env.MODE != "DEPLOY") {
    return true
  }
  if (!ctx.IsVerified) return false
  if (ctx.userId != requestId) return false
  return true
}
