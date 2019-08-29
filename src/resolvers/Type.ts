export type UserInfo = {
  username: string
  password: string
  name: string
  email: string
  age: number
  height: number
  weight: number
  profileImg: File
  phoneNum: number
  address: string
}

export type ItemInfo = {
  name: string
  brand: string
  originalPrice: number
  currentPrice: number
  itemType: string
  itemImg: File
}

export type PostInfo = {
  accountId: number
  channelId: number
  title: string
  content: string
}
