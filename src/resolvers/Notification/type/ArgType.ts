export type NotificationSetInfoInput = {
  notificationId: number
  notificationType: string

  accountId: number
  fetchTime: string
}

export type NotificationGetInfoInput = {
  accountId: number
  filterGeneral: NotificationFilterGeneral
}

type NotificationFilterGeneral = {
  start: number
  first: number
}
