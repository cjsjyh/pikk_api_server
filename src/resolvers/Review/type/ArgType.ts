import { ItemInfoInput } from "../../Item/type/ArgType"

export type QueryArgInfo = {
  reviewOption: ReviewQuery
}

//Mutation

export type ItemReviewInfoInput = {
  itemId: number
  item: ItemInfoInput
  recommendReason: string
  review: string
  score: number
  imgs: ItemReviewImgInfoInput[]
}

export type ItemReviewImgInfoInput = {
  img: any
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
