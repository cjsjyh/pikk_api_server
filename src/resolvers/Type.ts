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

export type FollowInfo = {
  targetType: string
  targetId: number
  accountId: number
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
  postTag: string
  styleTag: string
  img: [File]
}

export type CommentInfo = {
  accountId: number
  targetId: number
  targetType: string
  content: string
}
