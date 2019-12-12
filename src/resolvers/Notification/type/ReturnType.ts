export type NotificationInfo = {
  notificationId: number
  notificationType: string

  postId: number
  postType: string
  postTitle: string

  sentUserName: string[]
  sentUserImageUrl: string[]
  fetchTime: string

  content: string
  isViewed: boolean
  time: string
}

export type NotificationDBInfo = {
  notificationId: number
  notificationType: string

  postId: number
  postType: string
  postTitle: string

  sentUserName: string
  sentUserImageUrl: string

  content: string
  isViewed: boolean
  time: string
}
