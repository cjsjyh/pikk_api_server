import { ItemInfoInput } from "../../Item/type/ArgType"

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
