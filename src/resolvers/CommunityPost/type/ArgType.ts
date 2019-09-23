export type MutationArgInfo = {
  communityPostInfo: CommunityPostInfoInput
}

export type CommunityPostInfoInput = {
  accountId: number
  channelId: number
  title: string
  content: string
  postType: string
  qnaType: string
  img: any[]
}

export type QueryArgInfo = {
  communityPostOption: CommunityPostQuery
}

type QueryCommon = {
  start: number
  first: number
  sort: string
}

export type PostQueryFilter = {
  accountId: number
  postId: number
}

export type CommunityPostQueryFilter = {
  filterCommon: PostQueryFilter
  postType: string
  qnaType: string
  channelId: number
}

export interface CommunityPostQuery {
  filterCommon: QueryCommon
  postFilter: CommunityPostQueryFilter
  sortBy: string
}
