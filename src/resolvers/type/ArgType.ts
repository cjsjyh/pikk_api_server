import { SortDirection, ItemSortableField, PostSortableField } from "./enum"
import { UserInfo, FollowInfo, ItemInfo, PostInfo, CommentInfo } from "./ReturnType"

export type MutationArgInfo = {
  userInfo: UserInfo
  followInfo: FollowInfo
  itemInfo: ItemInfo
  postInfo: PostInfo
  commentInfo: CommentInfo
}

export type QueryArgInfo = {
  itemOption: ItemQuery
  userOption: UserQuery
  communityPostOption: CommunityPostQuery
  recommendPostOption: RecommendPostQuery
}

type QueryCommon = {
  start: number
  first: number
  sort: SortDirection
}

export interface ItemQuery {
  filter: QueryCommon
  sortBy: ItemSortableField
}

export type UserQuery = {
  id: number
}

export interface CommunityPostQuery {
  filter: QueryCommon
  accountId: number
  sortBy: PostSortableField
}

export interface RecommendPostQuery {
  filter: QueryCommon
  accountId: number
  sortBy: PostSortableField
}
