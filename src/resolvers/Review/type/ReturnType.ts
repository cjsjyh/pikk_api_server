import { ItemInfo } from "../../Item/type/ReturnType"
import { UserInfo } from "../../User/type/ReturnType"

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
  review: string
  score: number
  images: ItemReviewImgInfo[]

  itemInfo: ItemInfo
  userInfo: UserInfo
}

export type ItemReviewImgInfo = {
  //DB
  FK_reviewId: number
  //Img
  id: number
  reviewId: number
  imageUrl: string
}
