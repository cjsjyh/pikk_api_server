import { logWithDate } from "../Utils/stringUtil"
import { GetBoardName } from "../Comment/util"
import { NotificationInfo } from "./type/ReturnType"
import { RunSingleSQL } from "../Utils/promiseUtil"
import { PushRedisQueue, PopRedisQueue } from "../../database/redisConnect"

export async function ProcessNotificationQueue() {
  let task = await PopRedisQueue("Notification_Queue")
  if (task.notiType == "WRITER") {
    await NotifyPostWriter(task.targetId, task.targetType, task.content)
  } else if (task.notiType == "FOLLOWERS") {
    await NotifyFollowers(task.targetId, task.targetType, task.targetTitle, task.writerId)
  } else if (task.notiType == "COMMENT_WRITER") {
    await NotifyCommentWriter(task.targetId, task.targetType, task.content, task.parentId)
  } else {
    logWithDate("Invalid Notification Queue notiType")
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
  let queueData
  if (notiType == "WRITER") {
    queueData = {
      notiType: notiType,
      targetId: targetId,
      targetType: targetType,
      content: content
    }
  } else if (notiType == "FOLLOWERS") {
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
    logWithDate("Invalid Notification Queue notiType")
  }

  await PushRedisQueue("Notification_Queue", JSON.stringify(queueData))
}

async function NotifyPostWriter(postId: number, postType: string, content: string) {
  let NotiInfo: NotificationInfo
  NotiInfo.targetId = postId
  NotiInfo.targetType = postType

  //Get PostInfo of the post
  let postResult = await RunSingleSQL(`
    SELECT post."FK_accountId", post.title FROM "${GetBoardName(postType)}" post WHERE "id" =${postId}
  `)
  NotiInfo.accountId = postResult.FK_accountId
  NotiInfo.targetTitle = postResult.title
  NotiInfo.content = content

  await RunSingleSQL(`
    INSERT INTO "NOTIFICATION"("targetId","targetType","targetTitle","content","FK_accountId") 
    VALUES (${NotiInfo.targetId},${NotiInfo.targetType},'${NotiInfo.targetTitle}','${NotiInfo.content}',${NotiInfo.accountId})
  `)
}

async function NotifyFollowers(postId: number, postType: string, postTitle: string, writerId: number) {
  let NotiInfo: NotificationInfo
  NotiInfo.targetId = postId
  NotiInfo.targetType = postType
  NotiInfo.targetTitle = postTitle
  NotiInfo.content = null

  await RunSingleSQL(`
    INSERT INTO "NOTIFICATION"("targetId","targetType","targetTitle","content","FK_accountId") 
    VALUES ( 
      SELECT ${NotiInfo.targetId},${NotiInfo.targetType},'${NotiInfo.targetTitle}','${NotiInfo.content}',${NotiInfo.accountId},"FK_accountId"
      FROM "CHANNEL_FOLLOWER" WHERE "FK_channelId"=${writerId}
    )
  `)
}

async function NotifyCommentWriter(postId: number, postType: string, content: string, parentId: number) {
  let NotiInfo: NotificationInfo
  NotiInfo.targetId = postId
  NotiInfo.targetType = postType
  //Get PostInfo of parent comment Id
  let postResult = await RunSingleSQL(`
    SELECT post.title FROM "${GetBoardName(postType)}" post, "${GetBoardName(postType)}_COMMENT" com
    WHERE com.id=${postId} AND com."FK_postId"=post.id
  `)
  NotiInfo.targetTitle = postResult.title

  //Get accountId of the parent comment
  let commentResult = await RunSingleSQL(`
    SELECT com."FK_accountId" FROM "${GetBoardName(postType)}_COMMENT" WHERE id = ${parentId}
  `)
  NotiInfo.accountId = commentResult.FK_accountId
  NotiInfo.content = content

  await RunSingleSQL(`
    INSERT INTO "NOTIFICATION"("targetId","targetType","targetTitle","content","FK_accountId") 
    VALUES (${NotiInfo.targetId},${NotiInfo.targetType},'${NotiInfo.targetTitle}','${NotiInfo.content}',${NotiInfo.accountId})
`)
}
