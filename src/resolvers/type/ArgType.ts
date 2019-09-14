import { FollowInfo, ItemInfo } from "./ReturnType"
import { GraphQLUpload } from "graphql-upload"
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
  providerId: string
}

export type UserInfoInput = {
  id: number
  name: string
  email: string
  age: number
  height: number
  weight: number
  profileImg: any
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
  img: any[]
}

export type RecommendPostInfoInput = {
  accountId: number
  title: string
  content: string
  postType: string
  styleType: string
  saleEndDate: string
  titleType: string
  titleImg: any
  titleYoutubeUrl: string
  reviews: ItemReviewInfoInput[]
}

export type ItemReviewInfoInput = {
  itemId: number
  item: ItemInfoInput
  recommendReason: string
  shortReview: string
  img: any
  score: number
  cards: ItemReviewCardInfoInput[]
}

export type ItemReviewCardInfoInput = {
  title: string
  content: string
  img: any
}

export type ItemInfoInput = {
  name: string
  brand: string
  originalPrice: number
  salePrice: number
  itemMinorType: string
  itemMajorType: string
  purchaseUrl: string
  itemImg: any
}

//--------------
//   Query
//--------------
export type QueryArgInfo = {
  itemOption: ItemQuery
  pickkItemOption: PickkItemQuery
  userOption: UserQuery
  communityPostOption: CommunityPostQuery
  recommendPostOption: RecommendPostQuery
  pickkRecommendPostOption: PickkRecommendPostQuery
  pickkChannelOption: PickkChannelQuery
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
  itemId: number
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
  channelId: number
}

export type RecommendPostQueryFilter = {
  filterCommon: PostQueryFilter
  postType: string
  styleType: string
  itemId: number
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

export interface PickkRecommendPostQuery {
  filterCommon: QueryCommon
  userId: number
}

export interface PickkItemQuery {
  filterCommon: QueryCommon
  userId: number
}

export interface PickkChannelQuery {
  filterCommon: QueryCommon
  userId: number
}
