export type CommunityPostInfo = {
  //DB
  FK_accountId: number
  FK_channelId: number
  //User
  accountId: number
  name: string
  profileImgUrl: string
  //Post Info
  id: number
  channelId: number
  title: string
  content: string
  time: string
  viewcount: number
  imageUrls: string[]
  postType: string
  qnaType: string

  pickCount: number
  commentCount: number
}

export type ImageInfo = {
  imageUrl: string
}
