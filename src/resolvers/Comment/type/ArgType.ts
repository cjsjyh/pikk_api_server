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

type CommentFilterGeneral = {
  start: number
  first: number
  sort: string
  sortBy: string
}

export type CommentQuery = {
  filterGeneral: CommentFilterGeneral
  boardType: string
  postId: number
}
