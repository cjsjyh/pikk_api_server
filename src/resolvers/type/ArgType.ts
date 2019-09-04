import { SortDirection, ItemSortableField, PostSortableField } from "./enum"
import { UserInfo, FollowInfo, ItemInfo, CommentInfo, itemReviewInfo } from "./ReturnType"

import { RecommendPostType, StyleType, RecommendReason } from "./enum"

//--------------
//   Mutation
//--------------

export type MutationArgInfo = {
  userInfo: UserInfo
  followInfo: FollowInfo
  itemInfo: ItemInfo
  recommendPostInfo: RecommendPostInfoInput
  communityPostInfo: CommunityPostInfoInput
  commentInfo: CommentInfo
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
  review: itemReviewInfo[]
}

//--------------
//   Query
//--------------
export type QueryArgInfo = {
  itemOption: ItemQuery
  userOption: UserQuery
  communityPostOption: CommunityPostQuery
  recommendPostOption: RecommendPostQuery
}

type QueryCommon = {
  start: number
  first: number
  sort: SortDirection
}

export interface ItemQuery {
  filter: QueryCommon
  sortBy: ItemSortableField
}

export type UserQuery = {
  id: number
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
