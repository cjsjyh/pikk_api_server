export function ValidateUser(ctx: any, requestId: number): boolean {
  if (process.env.MODE == "LOCAL") return true
  if (!ctx.isVerified) return false
  if (ctx.userId != requestId) return false
  return true
}
