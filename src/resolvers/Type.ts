//For Type declaration
import { SortDirection, ItemSortableField, PostSortableField } from "./enum"

export type ArgInfo = {
  userInfo: UserInfo
  followInfo: FollowInfo
  itemInfo: ItemInfo
  postInfo: PostInfo
  commentInfo: CommentInfo
  itemOption: ItemQuery
  userOption: UserQuery
  communityPostOption: CommunityPostQuery
  recommendPostOption: RecommendPostQuery
}

//Return
export type UserInfo = {
  username: string
  password: string
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

export type FollowInfo = {
  targetType: string
  targetId: number
  accountId: number
}

//Return
export type ItemInfo = {
  name: string
  brand: string
  originalPrice: number
  currentPrice: number
  itemType: string
  itemImg: File
}

//Return
export type PostInfo = {
  FK_accountId: number
  FK_channelId: number
  name: string
  profileImgUrl: string

  id: number
  accountId: number
  channelId: number
  title: string
  content: string
  postType: string
  styleType: string
  img: File[]
  imageUrl: string[]
  review: itemReviewInfo[]
}

export type itemReviewInfo = {
  itemId: number
  recommendTag: string
  shortReview: string
  fullReview: string
  score: number
  reviewImg: File[]
  reviewImgUrl: string[]
}

export type CommentInfo = {
  accountId: number
  targetId: number
  targetType: string
  content: string
}

export type ImageInfo = {
  imageUrl: string
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
