import { ItemReviewInfoInput, ItemReviewEditInfoInput } from "../../Review/type/ArgType"
//-------------
//Mutation
//-------------

export type MutationArgInfo = {
  recommendPostInfo: RecommendPostInfoInput
  recommendPostEditInfo: RecommendPostEditInfoInput
  recommendPostDeleteInfo: RecommendPostDeleteInfoInput
}

export type RecommendPostInfoInput = {
  accountId: number
  title: string
  content: string
  postType: string
  styleType: string
  saleEndDate: string
  titleType: string
  titleImageUrl: string
  titleYoutubeUrl: string
  reviews: ItemReviewInfoInput[]
}

export type RecommendPostEditInfoInput = {
  postId: number
  accountId: number
  title: string
  content: string
  postType: string
  styleType: string
  saleEndDate: string
  titleType: string
  titleImageUrl: string
  titleYoutubeUrl: string

  deletedReviews: number[]
  deletedImages: number[]
  reviews: ItemReviewEditInfoInput[]
}

export type RecommendPostDeleteInfoInput = {
  postId: number
  accountId: number
}

//-------------
//Query
//-------------

export type QueryArgInfo = {
  recommendPostOption: RecommendPostQuery
  pickkRecommendPostOption: PickkRecommendPostQuery
}

type RecommendPostFilterGeneral = {
  start: number
  first: number
  sort: string
  sortBy: string
}

export type RecommendPostQueryFilter = {
  accountId: number
  postId: number
  postType: string
  styleType: string
  itemId: number
  minimumPickCount: number
}

export interface RecommendPostQuery {
  filterGeneral: RecommendPostFilterGeneral
  postFilter: RecommendPostQueryFilter
}

export interface PickkRecommendPostQuery {
  filterGeneral: RecommendPostFilterGeneral
  userId: number
}
