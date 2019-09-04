import { RecommendPostType, StyleType, RecommendReason } from "./enum"

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
  itemMinorType: string
  itemMajorType: string
  itemImg: File
}

//Return
export type PostInfo = {
  FK_accountId: number
  FK_channelId: number

  name: string
  accountId: number
  profileImgUrl: string

  id: number
  channelId: number
  title: string
  content: string
  postType: RecommendPostType
  styleType: StyleType
  img: File[]
  imageUrl: string[]
  review: itemReviewInfo[]
}

export type itemReviewInfo = {
  itemId: number
  recommendReason: RecommendReason
  shortReview: string
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
