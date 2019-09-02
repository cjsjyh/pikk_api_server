//For Type declaration
import { SortDirection, SortableField } from "./enum"

export type ArgInfo = {
  userInfo: UserInfo
  followInfo: FollowInfo
  itemInfo: ItemInfo
  postInfo: PostInfo
  commentInfo: CommentInfo
  itemOption: ItemQuery
  userOption: UserQuery
}

export type UserInfo = {
  username: string
  password: string
  name: string
  email: string
  age: number
  height: number
  weight: number
  profileImg: File
  phoneNum: number
  address: string
}

export type FollowInfo = {
  targetType: string
  targetId: number
  accountId: number
}

export type ItemInfo = {
  name: string
  brand: string
  originalPrice: number
  currentPrice: number
  itemType: string
  itemImg: File
}

export type PostInfo = {
  accountId: number
  channelId: number
  title: string
  content: string
  postTag: string
  styleTag: string
  img: File[]
  review: itemReviewInfo[]
}

export type itemReviewInfo = {
  itemId: number
  recommendTag: string
  shortReview: string
  fullReview: string
  score: number
  reviewImg: File[]
}

export type CommentInfo = {
  accountId: number
  targetId: number
  targetType: string
  content: string
}

export type ItemQuery = {
  start: number
  first: number
  sort: SortDirection
  sortBy: SortableField
}

export type UserQuery = {
  id: number
}
