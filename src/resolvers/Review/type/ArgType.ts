import { ItemInfoInput } from "../../Item/type/ArgType"

export type QueryArgInfo = {
  reviewOption: ReviewQuery
}

//Mutation

export type ItemReviewInfoInput = {
  itemId: number
  item: ItemInfoInput
  recommendReason: string
  shortReview: string
  img: any
  score: number
  cards: ItemReviewCardInfoInput[]
}

export type ItemReviewCardInfoInput = {
  title: string
  content: string
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
