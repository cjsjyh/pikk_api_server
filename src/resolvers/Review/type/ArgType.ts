import { ItemInfoInput } from "../../Item/type/ArgType"

export type QueryArgInfo = {
  reviewOption: ReviewQuery
  incrementOption: IncrementReviewCount
}

//Mutation

export type ItemReviewInfoInput = {
  itemId: number
  item: ItemInfoInput
  recommendReason: string
  shortReview: string
  review: string
  score: number
  imgs: ItemReviewImgInfoInput[]
}

export type ItemReviewImgInfoInput = {
  img: any
}

export type IncrementReviewCount = {
  id: number
  type: string
}

//Query
type ReviewFilterGeneral = {
  start: number
  first: number
  sort: string
  sortBy: string
}

export type ReviewQueryFilter = {
  reviewId: number
  itemId: number
}

export interface ReviewQuery {
  filterGeneral: ReviewFilterGeneral
  reviewFilter: ReviewQueryFilter
}
