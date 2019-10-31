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
  imageUrls: string[]
}

export type QueryArgInfo = {
  communityPostOption: CommunityPostQuery
}

type CommunityPostFilterGeneral = {
  start: number
  first: number
  sort: string
  sortBy: string
}

export type CommunityPostQueryFilter = {
  accountId: number
  postId: number
  postType: string
  qnaType: string
  channelId: number
}

export interface CommunityPostQuery {
  filterGeneral: CommunityPostFilterGeneral
  postFilter: CommunityPostQueryFilter
}
