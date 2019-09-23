import { ItemReviewInfo } from "../../Review/type/ReturnType"

export type RecommendPostInfo = {
  //DB
  FK_accountId: number
  //USER
  accountId: number
  name: string
  profileImgUrl: string
  //LOOK
  pickCount: number
  //POST
  id: number
  title: string
  titleType: string
  titleImageUrl: string
  titleYoutubeUrl: string
  time: string
  viewcount: number
  content: string
  reviews: ItemReviewInfo[]
  postType: string
  styleType: string
  saleEndDate: string
  commentCount: number
}
