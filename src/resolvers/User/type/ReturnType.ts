export type UserInfo = {
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
}

export type UserCredentialInfo = {
  isNewUser: boolean
  id: number
  token: string

  name: string
  profileImgUrl: string
  rank: number
}

export type ChannelInfo = {
  //User
  name: string
  profileImgUrl: string
  //Follow
  pickkCount: number
  //Channel
  id: number
  backgroundImgUrl: string
  description: string
  snsUrl: string
}
