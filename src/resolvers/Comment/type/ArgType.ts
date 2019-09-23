export type MutationArgInfo = {
  commentInfo: CommentInfoInput
}

export type CommentInfoInput = {
  accountId: number
  targetId: number
  targetType: string
  content: string
}

export type QueryArgInfo = {
  commentOption: CommentQuery
}

type QueryCommon = {
  start: number
  first: number
  sort: string
}

export type CommentQuery = {
  filterCommon: QueryCommon
  boardType: string
  postId: number
}
