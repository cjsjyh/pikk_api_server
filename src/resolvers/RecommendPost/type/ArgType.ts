import { ItemReviewInfoInput } from "../../Review/type/ArgType"
//Mutation
export type MutationArgInfo = {
  recommendPostInfo: RecommendPostInfoInput
}

export type RecommendPostInfoInput = {
  accountId: number
  title: string
  content: string
  postType: string
  styleType: string
  saleEndDate: string
  titleType: string
  titleImg: any
  titleYoutubeUrl: string
  reviews: ItemReviewInfoInput[]
}

//Query

export type QueryArgInfo = {
  recommendPostOption: RecommendPostQuery
  pickkRecommendPostOption: PickkRecommendPostQuery
}

type QueryCommon = {
  start: number
  first: number
  sort: string
}

export type PostQueryFilter = {
  accountId: number
  postId: number
}

export type RecommendPostQueryFilter = {
  filterCommon: PostQueryFilter
  postType: string
  styleType: string
  itemId: number
}

export interface RecommendPostQuery {
  filterCommon: QueryCommon
  postFilter: RecommendPostQueryFilter
  sortBy: string
}

export interface PickkRecommendPostQuery {
  filterCommon: QueryCommon
  userId: number
}
