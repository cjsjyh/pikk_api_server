export type CommentInfo = {
  //DB
  FK_postId: number
  FK_accountId: number
  //Comment
  id: number
  postId: number
  accountId: number
  content: string
  time: string
}
