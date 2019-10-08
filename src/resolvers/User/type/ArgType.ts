//Mutation
export type MutationArgInfo = {
  userAccountInfo: UserCredentialInput
  userInfo: UserInfoInput
}

export type UserCredentialInput = {
  providerType: string
  providerId: string
}

export type UserInfoInput = {
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
}

//Query
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
