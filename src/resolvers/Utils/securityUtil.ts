export function ValidateUser(ctx: any, requestId: number): boolean {
  if (!ctx.isVerified) return false
  if (ctx.userId != requestId) return false
  return true
}
