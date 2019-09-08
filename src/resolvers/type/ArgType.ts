import { SortDirection, ItemSortableField, PostSortableField } from "./enum"
import { UserInfo, FollowInfo, ItemInfo } from "./ReturnType"

import { RecommendPostType, StyleType, RecommendReason, BoardType } from "./enum"

//--------------
//   Mutation
//--------------
export type MutationArgInfo = {
  userInfo: UserInfo
  followInfo: FollowInfo
  itemInfo: ItemInfo
  recommendPostInfo: RecommendPostInfoInput
  communityPostInfo: CommunityPostInfoInput
  commentInfo: CommentInfoInput
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
  img: File[]
}

export type RecommendPostInfoInput = {
  accountId: number
  title: string
  content: string
  postType: RecommendPostType
  styleType: StyleType
  titleImg: File
  reviews: ItemReviewInfoInput[]
}

export type ItemReviewInfoInput = {
  itemId: number
  item: ItemInfoInput
  recommendReason: RecommendReason
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

export interface ItemQuery {
  filter: QueryCommon
  sortBy: ItemSortableField
}

export type UserQuery = {
  id: number
}

export type CommentQuery = {
  filter: QueryCommon
  boardType: BoardType
  postId: number
}

export interface CommunityPostQuery {
  filter: QueryCommon
  accountId: number
  sortBy: PostSortableField
}

export interface RecommendPostQuery {
  filter: QueryCommon
  accountId: number
  sortBy: PostSortableField
}
