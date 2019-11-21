export type CommentInfo = {
  //DB
  FK_postId: number
  FK_accountId: number
  FK_parentId: number
  //Comment
  id: number
  postId: number
  accountId: number
  parentId: number
  content: string
  time: string
}
