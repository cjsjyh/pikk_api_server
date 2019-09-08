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
  purchaseUrl: string
}

export type CommunityPostInfo = {
  //DB
  FK_accountId: number
  FK_channelId: number
  //User
  accountId: number
  name: string
  profileImgUrl: string
  //Post Info
  id: number
  channelId: number
  title: string
  content: string
  time: string
  imageUrl: string[]
}

export type RecommendPostInfo = {
  //DB
  FK_accountId: number
  //USER
  accountId: number
  name: string
  profileImgUrl: string
  //POST
  id: number
  title: string
  titleImageUrl: string
  time: string
  postType: RecommendPostType
  styleType: StyleType
  content: string
  reviews: ItemReviewInfo[]
}

export type ItemReviewInfo = {
  //DB
  FK_itemId: number
  FK_postId: number
  //Review
  id: number
  itemId: number
  postId: number
  recommendReason: RecommendReason
  shortReview: string
  score: number
  cards: ItemReviewCardInfo[]
}

export type ItemReviewCardInfo = {
  //DB
  FK_reviewId: number
  //Card
  id: number
  reviewId: number
  title: string
  content: string
  ImgUrl: string
}

export type ImageInfo = {
  imageUrl: string
}
