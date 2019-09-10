import { FollowInfo, ItemInfo } from "./ReturnType"

//--------------
//   Mutation
//--------------
export type MutationArgInfo = {
  userAccountInfo: UserCredentialInput
  userInfo: UserInfoInput
  followInfo: FollowInfo
  itemInfo: ItemInfo
  recommendPostInfo: RecommendPostInfoInput
  communityPostInfo: CommunityPostInfoInput
  commentInfo: CommentInfoInput
}

export type UserCredentialInput = {
  providerType: string
  providerId: number
}

export type UserInfoInput = {
  id: number
  name: string
  email: string
  age: number
  height: number
  weight: number
  profileImg: File
  profileImgUrl: string
  phoneNum: number
  address: string
}

export type CommentInfoInput = {
  accountId: number
  targetId: number
  targetType: string
  content: string
}

export type CommunityPostInfoInput = {
  accountId: number
  channelId: number
  title: string
  content: string
  postType: string
  qnaType: string
  img: File[]
}

export type RecommendPostInfoInput = {
  accountId: number
  title: string
  content: string
  postType: string
  styleType: string
  titleImg: File
  reviews: ItemReviewInfoInput[]
}

export type ItemReviewInfoInput = {
  itemId: number
  item: ItemInfoInput
  recommendReason: string
  shortReview: string
  score: number
  cards: ItemReviewCardInfoInput[]
}

export type ItemReviewCardInfoInput = {
  title: string
  content: string
  img: File
}

export type ItemInfoInput = {
  name: string
  brand: string
  originalPrice: number
  itemMinorType: string
  itemMajorType: string
  purchaseUrl: string
  itemImg: File
}

//--------------
//   Query
//--------------
export type QueryArgInfo = {
  itemOption: ItemQuery
  userOption: UserQuery
  communityPostOption: CommunityPostQuery
  recommendPostOption: RecommendPostQuery
  commentOption: CommentQuery
}

type QueryCommon = {
  start: number
  first: number
  sort: string
}

export type ItemQueryFilter = {
  itemMajorType: string
  itemMinorType: string
}

export interface ItemQuery {
  filterCommon: QueryCommon
  itemFilter: ItemQueryFilter
  sortBy: string
}

export type UserQuery = {
  id: number
}

export type CommentQuery = {
  filterCommon: QueryCommon
  boardType: string
  postId: number
}

export type PostQueryFilter = {
  accountId: number
  postId: number
}

export type CommunityPostQueryFilter = {
  filterCommon: PostQueryFilter
  postType: string
  qnaType: string
}

export type RecommendPostQueryFilter = {
  filterCommon: PostQueryFilter
  postType: string
  styleType: string
}

export interface CommunityPostQuery {
  filterCommon: QueryCommon
  postFilter: CommunityPostQueryFilter
  sortBy: string
}

export interface RecommendPostQuery {
  filterCommon: QueryCommon
  postFilter: RecommendPostQueryFilter
  sortBy: string
}
