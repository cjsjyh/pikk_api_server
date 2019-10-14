export type UserInfo = {
  id: number
  name: string
  email: string
  age: number
  height: number
  weight: number
  profileImg: any
  profileImgUrl: string
  phoneNum: number
  address: string
  rank: number
  //Channel
  channel_titleImgUrl: string
  channel_description: string
  channel_snsUrl: string
  channel_pickCount: number
}

export type UserCredentialInfo = {
  isNewUser: boolean
  id: number
  token: string

  name: string
  profileImgUrl: string
  rank: number
}
