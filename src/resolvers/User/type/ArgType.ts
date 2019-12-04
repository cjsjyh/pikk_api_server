//-----------
//Mutation
//-----------
export type MutationArgInfo = {
  userAccountInfo: UserCredentialInput
  userInfo: UserInfoInput
  userEditInfo: UserEditInfoInput
  userChannelInfo: UserChannelInfoInput
}

export type UserCredentialInput = {
  providerType: string
  providerId: string
}

export type UserInfoInput = {
  accountId: number
  name: string
  email: string
  age: number
  height: number
  weight: number
  profileImageUrl: any
  profileImgUrl: string
  phoneNum: number
  address: string
  rank: number
}

export type UserEditInfoInput = {
  accountId: number
  name: string
  email: string
  age: number
  height: number
  weight: number
  profileImageUrl: string
  profileImgUrl: string
  phoneNum: number
  address: string
  rank: number
}

export type UserChannelInfoInput = {
  accountId: number
  channel_snsUrl: string
  channel_titleImageUrl: string
  channel_description: string
}

//-----------
//Query
//-----------
export type QueryArgInfo = {
  userOption: UserQuery
  channelOption: ChannelQuery
  pickkChannelOption: PickkChannelQuery
}

type UserFilterGeneral = {
  start: number
  first: number
  sort: string
  sortBy: string
}

export type UserQuery = {
  id: number
}

export type ChannelQuery = {
  id: number
}

export interface PickkChannelQuery {
  filterGeneral: UserFilterGeneral
  userId: number
}
