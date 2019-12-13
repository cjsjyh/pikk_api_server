import { GetBoardName } from "../Comment/util"
import { NotificationInfo, NotificationDBInfo } from "./type/ReturnType"
import { RunSingleSQL } from "../Utils/promiseUtil"
import { PushRedisQueue, PopRedisQueue, RedisQueueLength } from "../../database/redisConnect"
import { NotificationSetInfoInput } from "./type/ArgType"
var logger = require("../../tools/logger")

export async function InsertIntoNotificationQueue(
  notiType: string,
  targetId: number,
  targetType: string,
  targetTitle?: string,
  content?: string,
  parentId?: number,
  sentUserId?: number
) {
  try {
    let queueData = {
      notiType: notiType,
      targetId: targetId,
      targetType: targetType,
      targetTitle: targetTitle,
      content: content,
      parentId: parentId,
      sentUserId: sentUserId
    }

    await PushRedisQueue("Notification_Queue", JSON.stringify(queueData))
    logger.info("Inserted into Notification Queue")
  } catch (e) {
    logger.warn("Failed to insert into notification queue")
    logger.error(e.stack)
  }
}

export async function ProcessNotificationQueue() {
  while ((await RedisQueueLength("Notification_Queue")) != 0) {
    let task = await PopRedisQueue("Notification_Queue")
    task = JSON.parse(task)
    if (task.notiType == "COMMENT_TO_MY_POST") {
      await NotifyPostWriter(task.targetId, task.targetType, task.content, task.sentUserId, task.notiType)
    } else if (task.notiType == "NEW_PICKK_TO_MY_POST") {
      await NotifyPostWriter(task.targetId, task.targetType, task.content, task.sentUserId, task.notiType)
    } else if (task.notiType == "NEW_RECOMMEND_POST_BY_MY_PICKK_CHANNEL") {
      await NotifyFollowers(task.targetId, task.targetType, task.targetTitle, task.sentUserId, task.notiType)
    } else if (task.notiType == "COMMENT_TO_MY_COMMENT") {
      await NotifyCommentWriter(task.targetId, task.targetType, task.content, task.parentId, task.sentUserId, task.notiType)
    } else if (task.notiType == "NEW_PICKK_TO_MY_CHANNEL") {
      await NotifyChannelOwner(task.targetId, task.sentUserId, task.notiType)
    } else {
      logger.warn("Invalid Notification Queue notiType")
    }
  }
}

async function NotifyPostWriter(postId: number, postType: string, content: string, sentUserId: number, notiType: string) {
  let NotiInfo: NotificationInfo = {} as NotificationInfo
  try {
    //Get PostInfo of the post
    let postResult = await RunSingleSQL(`
    SELECT post."FK_accountId", post.title FROM "${GetBoardName(postType)}" post WHERE "id" =${postId}
    `)

    NotiInfo.postId = postId
    NotiInfo.postType = postType
    NotiInfo.postTitle = postResult[0].title

    NotiInfo.content = content

    await RunSingleSQL(`
    INSERT INTO "NOTIFICATION"
    ("notificationType","postId","postType","postTitle","content","FK_sentUserId","FK_accountId") 
    VALUES (
      '${notiType}',
      ${NotiInfo.postId},
      '${NotiInfo.postType}',
      '${NotiInfo.postTitle}',
      '${NotiInfo.content}',
      ${sentUserId},
      ${postResult[0].FK_accountId}
    )`)
    logger.info(`Notified ${NotiInfo.postType}Post Writer of postId: ${NotiInfo.postId}`)
  } catch (e) {
    logger.warn(`Failed to Notify RecPost Writer of postId: ${NotiInfo.postId}`)
    logger.error(e.stack)
  }
}

async function NotifyChannelOwner(channelId: number, sentUserId: number, notiType: string) {
  try {
    await RunSingleSQL(`
      INSERT INTO "NOTIFICATION"
      ("notificationType","FK_accountId","FK_sentUserId") VALUES
      ('${notiType}',${channelId},${sentUserId})
    `)
    logger.info(`Noified Channel Owner of ${channelId}`)
  } catch (e) {
    logger.warn(`Failed to Notify Channel Owner of ${channelId}`)
    logger.error(e.stack)
  }
}

async function NotifyFollowers(postId: number, postType: string, postTitle: string, sentUserId: number, notiType: string) {
  let NotiInfo: NotificationInfo = {} as NotificationInfo
  try {
    NotiInfo.postId = postId
    NotiInfo.postType = postType
    NotiInfo.postTitle = postTitle
    NotiInfo.content = null

    await RunSingleSQL(`
      INSERT INTO "NOTIFICATION"
      ("notificationType","postId","postType","postTitle","content","FK_sentUserId","FK_accountId") 
      SELECT 
        '${notiType}',
        ${NotiInfo.postId},
        '${NotiInfo.postType}',
        '${NotiInfo.postTitle}',
        '${NotiInfo.content}',
        ${sentUserId},
        "FK_accountId"
      FROM "CHANNEL_FOLLOWER" WHERE "FK_channelId"=${sentUserId}
    `)
    logger.info(`Notified Channel Followers of ${sentUserId} postId: ${NotiInfo.postId}`)
  } catch (e) {
    logger.warn(`Failed to Notify Channel Followers of ${sentUserId} postId: ${NotiInfo.postId}`)
    logger.error(e.stack)
  }
}

async function NotifyCommentWriter(postId: number, postType: string, content: string, parentId: number, sentUserId: number, notiType: string) {
  let NotiInfo: NotificationInfo = {} as NotificationInfo
  try {
    NotiInfo.postId = postId
    NotiInfo.postType = postType
    //Get PostInfo of parent comment Id
    let postResult = await RunSingleSQL(`
    SELECT post.title FROM "${GetBoardName(postType)}" post WHERE post.id=${postId}
    `)
    NotiInfo.postTitle = postResult[0].title

    //Get accountId of the parent comment
    let commentResult = await RunSingleSQL(`
    SELECT com."FK_accountId" FROM "${GetBoardName(postType)}_COMMENT" com WHERE id = ${parentId}
    `)
    NotiInfo.content = content

    await RunSingleSQL(`
    INSERT INTO "NOTIFICATION"
    ("notificationType","postId","postType","postTitle","content","FK_sentUserId","FK_accountId") 
    VALUES 
    (
      '${notiType}',
      ${NotiInfo.postId},
      '${NotiInfo.postType}',
      '${NotiInfo.postTitle}',
      '${NotiInfo.content}',
      ${sentUserId},
      ${commentResult[0].FK_accountId}
    )`)
    logger.info(`Notified comment writer of Comment ${parentId}`)
  } catch (e) {
    logger.warn(`Failed to Notify comment Writer of Comment ${parentId}`)
    logger.error(e.stack)
  }
}

export function GroupPickNotifications(dbResult: any): NotificationInfo[] {
  let dict = {}
  let notiGroup = []
  //Find records to group
  dbResult.forEach((record: any, index: number) => {
    //Set Result to match GraphQL
    record.sentUserImageUrl = [record.sentUserImageUrl]
    record.sentUserName = [record.sentUserName]
    record.fetchTime = Date.now()

    if (record.notificationType == "NEW_PICKK_TO_MY_POST" || record.notificationType == "NEW_PICKK_TO_MY_CHANNEL") {
      let key = record.notificationType + String(record.postId) + String(record.isViewed)
      //Key not set yet
      if (!(key in dict)) {
        dict[key] = notiGroup.length
        notiGroup.push([])
      }
      notiGroup[dict[key]].push(index)
    }
  })

  //Group and delete
  notiGroup.forEach(indexGroup => {
    indexGroup.forEach((notiIndex, index) => {
      if (index == 0) return
      let recordToPop = dbResult[notiIndex]
      //Find head Record to push other records
      let headRecordIndex = indexGroup[0]
      dbResult[headRecordIndex].sentUserImageUrl.push(recordToPop.sentUserImageUrl[0])
      dbResult[headRecordIndex].sentUserName.push(recordToPop.sentUserName[0])

      //pop record
      dbResult.splice(notiIndex, 1)
    })
  })

  return dbResult
}

export function BulkUpdateNotificationsSQL(arg: NotificationSetInfoInput): string {
  let result = ""

  if (arg.notificationType == "NEW_PICKK_TO_POST") {
    result = ` "FK_accountId"=${arg.accountId} AND 
    "notificationType"='${arg.notificationType}' AND
    EXTRACT(epoch FROM "time") < ${arg.fetchTime}
    `
  } else {
    result = ` id=${arg.notificationId}`
  }

  return result
}
