import { GetBoardName } from "../Comment/util"
import { NotificationInfo } from "./type/ReturnType"
import { RunSingleSQL } from "../Utils/promiseUtil"
import { PushRedisQueue, PopRedisQueue, RedisQueueLength } from "../../database/redisConnect"
var logger = require("../../tools/logger")

export async function ProcessNotificationQueue() {
  while ((await RedisQueueLength("Notification_Queue")) != "0") {
    let task = await PopRedisQueue("Notification_Queue")
    task = JSON.parse(task)
    if (task.notiType == "RECPOST_WRITER") {
      await NotifyPostWriter(task.targetId, task.targetType, task.content)
    } else if (task.notiType == "CHANNEL_FOLLOWERS") {
      await NotifyFollowers(task.targetId, task.targetType, task.targetTitle, task.writerId)
    } else if (task.notiType == "COMMENT_WRITER") {
      await NotifyCommentWriter(task.targetId, task.targetType, task.content, task.parentId)
    } else {
      logger.warn("Invalid Notification Queue notiType")
    }
  }
}

export async function InsertIntoNotificationQueue(
  notiType: string,
  targetId: number,
  targetType: string,
  targetTitle?: string,
  content?: string,
  parentId?: number,
  writerId?: number
) {
  try {
    let queueData
    if (notiType == "RECPOST_WRITER") {
      queueData = {
        notiType: notiType,
        targetId: targetId,
        targetType: targetType,
        content: content
      }
    } else if (notiType == "CHANNEL_FOLLOWERS") {
      queueData = {
        notiType: notiType,
        targetId: targetId,
        targetType: targetType,
        targetTitle: targetTitle,
        writerId: writerId
      }
    } else if (notiType == "COMMENT_WRITER") {
      queueData = {
        notiType: notiType,
        targetId: targetId,
        targetType: targetType,
        content: content,
        parentId: parentId
      }
    } else {
      logger.warn("Invalid Notification Queue notiType")
    }

    await PushRedisQueue("Notification_Queue", JSON.stringify(queueData))
    logger.info("Inserted into Notification Queue")
  } catch (e) {
    logger.warn("Failed to insert into notification queue")
    logger.error(e.stack)
  }
}

async function NotifyPostWriter(postId: number, postType: string, content: string) {
  let NotiInfo: NotificationInfo = {} as NotificationInfo
  try {
    NotiInfo.targetId = postId
    NotiInfo.targetType = postType

    //Get PostInfo of the post
    let postResult = await RunSingleSQL(`
    SELECT post."FK_accountId", post.title FROM "${GetBoardName(postType)}" post WHERE "id" =${postId}
  `)
    NotiInfo.accountId = postResult[0].FK_accountId
    NotiInfo.targetTitle = postResult[0].title
    NotiInfo.content = content

    await RunSingleSQL(`
    INSERT INTO "NOTIFICATION"("targetId","targetType","targetTitle","content","FK_accountId") 
    VALUES (${NotiInfo.targetId},'${NotiInfo.targetType}','${NotiInfo.targetTitle}','${NotiInfo.content}',${NotiInfo.accountId})
  `)
    logger.info(`Notified RecPost Writer of postId: ${NotiInfo.targetId}`)
  } catch (e) {
    logger.warn(`Failed to Notify RecPost Writer of postId: ${NotiInfo.targetId}`)
    logger.error(e.stack)
  }
}

async function NotifyFollowers(postId: number, postType: string, postTitle: string, writerId: number) {
  let NotiInfo: NotificationInfo = {} as NotificationInfo
  try {
    NotiInfo.targetId = postId
    NotiInfo.targetType = postType
    NotiInfo.targetTitle = postTitle
    NotiInfo.content = null

    await RunSingleSQL(`
      INSERT INTO "NOTIFICATION"("targetId","targetType","targetTitle","content","FK_accountId") 
      SELECT ${NotiInfo.targetId},'${NotiInfo.targetType}','${NotiInfo.targetTitle}','${NotiInfo.content}',"FK_accountId"
      FROM "CHANNEL_FOLLOWER" WHERE "FK_channelId"=${writerId}
    `)
    logger.info(`Notified Channel Followers of ${writerId} postId: ${NotiInfo.targetId}`)
  } catch (e) {
    logger.warn(`Failed to Notify Channel Followers of ${writerId} postId: ${NotiInfo.targetId}`)
    logger.error(e.stack)
  }
}

async function NotifyCommentWriter(postId: number, postType: string, content: string, parentId: number) {
  let NotiInfo: NotificationInfo = {} as NotificationInfo
  try {
    NotiInfo.targetId = postId
    NotiInfo.targetType = postType
    //Get PostInfo of parent comment Id
    let postResult = await RunSingleSQL(`
    SELECT post.title FROM "${GetBoardName(postType)}" post WHERE post.id=${postId}
    `)
    NotiInfo.targetTitle = postResult[0].title

    //Get accountId of the parent comment
    let commentResult = await RunSingleSQL(`
    SELECT com."FK_accountId" FROM "${GetBoardName(postType)}_COMMENT" com WHERE id = ${parentId}
    `)
    NotiInfo.accountId = commentResult[0].FK_accountId
    NotiInfo.content = content

    await RunSingleSQL(`
    INSERT INTO "NOTIFICATION"("targetId","targetType","targetTitle","content","FK_accountId") 
    VALUES (${NotiInfo.targetId},'${NotiInfo.targetType}','${NotiInfo.targetTitle}','${NotiInfo.content}',${NotiInfo.accountId})
    `)
    logger.info(`Notified comment writer of Comment ${parentId}`)
  } catch (e) {
    logger.warn(`Failed to Notify comment Writer of Comment ${parentId}`)
    logger.error(e.stack)
  }
}
