//------------------
//  MUTATION
//------------------

export type MutationArgInfo = {
  communityPostInfo: CommunityPostInfoInput
  communityPostEditInfo: CommunityPostEditInfoInput
  communityPostDeleteInfo: CommunityPostDeleteInfoInput
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

export type CommunityPostEditInfoInput = {
  accountId: number
  postId: number
  title: string
  content: string
  postType: string
  qnaType: string
  imageUrls: CommunityPostEditImageInfo[]

  deletedImages: number[]
}
export type CommunityPostEditImageInfo = {
  imageId: number
  imageUrl: string
}

export type CommunityPostDeleteInfoInput = {
  accountId: number
  postId: number
}

//------------------
//  QUERY
//------------------

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
