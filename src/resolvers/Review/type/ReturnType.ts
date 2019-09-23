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
  imgUrl: string
}
