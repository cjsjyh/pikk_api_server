import { ItemInfoInput } from "../../Item/type/ArgType"

//--------------
//Mutation
//--------------

export type MutationArgInfo = {
  itemReviewEditInfo: ItemReviewEditInfoInput
}

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

export type ItemReviewEditInfoInput = {
  reviewId: number
  accountId: number
  recommendReason: string
  shortReview: string
  review: string
  score: number
}

//--------------
//Query
//--------------
export type QueryArgInfo = {
  reviewOption: ReviewQuery
  incrementOption: IncrementReviewCount
}
type ReviewFilterGeneral = {
  start: number
  first: number
  sort: string
  sortBy: string
}

export type ReviewQueryFilter = {
  reviewId: number
  itemId: number
  userId: number
}

export interface ReviewQuery {
  filterGeneral: ReviewFilterGeneral
  reviewFilter: ReviewQueryFilter
}
