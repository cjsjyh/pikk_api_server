import { RecommendPostInfo } from "./type/ReturnType"
import { RunSingleSQL } from "../Utils/util"
import { GetReviewsByPostList } from "../Review/util"
import { info } from "console"
import { GetSimpleItemListByPostList } from "../Item/util"
import { GraphQLResolveInfo } from "graphql"

export function RecommendPostMatchGraphQL(postList: RecommendPostInfo[]) {
  postList.forEach(post => {
    post.accountId = post.FK_accountId
  })
}

export async function GetRecommendPostList(sql: string, info: GraphQLResolveInfo) {
  let queryResult = await RunSingleSQL(sql)

  let postResult: any = queryResult
  if (postResult.length == 0) {
    return []
  }
  await GetReviewsByPostList(postResult, info)
  await GetSimpleItemListByPostList(postResult, info)
  RecommendPostMatchGraphQL(postResult)

  return postResult
}
