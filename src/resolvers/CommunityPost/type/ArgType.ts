//------------------
//  MUTATION
//------------------

export type MutationArgInfo = {
  communityPostInfo: CommunityPostInfoInput
  communityPostEditInfo: CommunityPostEditInfoInput
  communityPostDeleteInfo: CommunityPostDeleteInfoInput
}

export type CommunityPostContentInput = {
  text: string
  imageUrl: string
  contentType: string
}

export type CommunityPostContentEditInput = {
  id: number
  text: string
  imageUrl: string
  contentType: string
}

export type CommunityPostInfoInput = {
  accountId: number
  //channelId: number
  title: string
  contents: CommunityPostContentInput[]
  postType: string
  //qnaType: string
}

export type CommunityPostEditInfoInput = {
  accountId: number
  postId: number
  title: string
  postType: string
  contents: CommunityPostContentEditInput[]
  //qnaType: string

  deletedContents: number[]
}

export type CommunityPostImageInfo = {
  id: number
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
  pickkCommunityPostOption: PickkCommunityPostQuery
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
  //qnaType: string
  //channelId: number

  searchText: string
}

export interface CommunityPostQuery {
  filterGeneral: CommunityPostFilterGeneral
  postFilter: CommunityPostQueryFilter
}

export interface PickkCommunityPostQuery {
  filterGeneral: CommunityPostFilterGeneral
  userId: number
}
