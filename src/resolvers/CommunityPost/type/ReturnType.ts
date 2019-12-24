export type CommunityPostContent = {
  id: number
  text: string
  imageUrl: string
  contentType: string
}

export type CommunityPostInfo = {
  //DB
  FK_accountId: number
  //User
  accountId: number
  name: string
  profileImgUrl: string
  //Post Info
  id: number
  //channelId: number
  title: string
  contents: CommunityPostContent[]
  time: string
  viewcount: number
  postType: string

  pickCount: number
  commentCount: number
}
