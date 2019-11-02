import { ItemInfoInput, ItemEditInfoInput } from "../../Item/type/ArgType"

//--------------
//Mutation
//--------------

export type MutationArgInfo = {
  itemReviewEditInfo: ItemReviewEditInfoInput
}

export type ItemReviewInfoInput = {
  itemId: number
  recommendReason: string
  shortReview: string
  review: string
  score: number

  item: ItemInfoInput
  images: ItemReviewImgInfoInput[]
}

export type ItemReviewImgEditInfoInput = {
  id: number
  imageUrl: string
}

export type ItemReviewImgInfoInput = {
  imageUrl: any
}

export type IncrementReviewCount = {
  id: number
  type: string
}

export type ItemReviewEditInfoInput = {
  reviewId: number

  itemId: number
  recommendReason: string
  shortReview: string
  review: string
  score: number

  item: ItemEditInfoInput
  images: ItemReviewImgEditInfoInput[]
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
