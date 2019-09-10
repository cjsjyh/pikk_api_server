//Return
export type UserInfo = {
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

export type UserCredentialInfo = {
  isNewUser: boolean
  id: number
  token: string
}

//Return
export type ItemInfo = {
  id: number
  name: string
  brand: string
  originalPrice: number
  itemMinorType: string
  itemMajorType: string
  itemImg: File
  purchaseUrl: string

  pickCount: number
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
  //LOOK
  pickCount: number
  //POST
  id: number
  title: string
  titleImageUrl: string
  time: string
  postType: string
  styleType: string
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
  recommendReason: string
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

export type CommentInfo = {
  //DB
  FK_postId: number
  FK_accountId: number
  //Comment
  id: number
  postId: number
  accountId: number
  content: string
  time: string
}
