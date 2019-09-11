//Return
export type UserInfo = {
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

export type UserCredentialInfo = {
  isNewUser: boolean
  id: number
  token: string
}

export type ChannelInfo = {
  //User
  name: string
  profileImgUrl: string
  //Follow
  pickkCount: number
  //Channel
  id: number
  backgroundImgUrl: string
  description: string
  snsUrl: string
}

export type FollowInfo = {
  targetType: string
  targetId: number
  accountId: number
}

//Return
export type ItemInfo = {
  id: number
  name: string
  brand: string
  originalPrice: number
  salePrice: number
  itemMinorType: string
  itemMajorType: string
  itemImg: any
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
  viewcount: number
  imageUrl: string[]
  postType: string
  qnaType: string
  commentCount: number
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
  titleType: string
  titleImageUrl: string
  titleYoutubeUrl: string
  time: string
  viewcount: number
  content: string
  reviews: ItemReviewInfo[]
  postType: string
  styleType: string
  commentCount: number
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
