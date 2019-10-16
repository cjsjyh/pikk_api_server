import { RecommendPostInfo } from "./type/ReturnType"
import { RunSingleSQL } from "../Utils/promiseUtil"
import { GetReviewsByPostList } from "../Review/util"
import { info } from "console"
import { GetSimpleItemListByPostList } from "../Item/util"
import { GraphQLResolveInfo } from "graphql"
import { ConvertListToOrderedPair } from "../Utils/stringUtil"

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

export async function GetRecommendPostListById(idList: number[]) {
  let querySql = `
    SELECT * FROM "RECOMMEND_POST" post
    JOIN (
      VALUES
      ${ConvertListToOrderedPair(idList)}
    ) AS x (id,ordering) ON post.id = x.id
    order by x.ordering
  `
}

export async function GetRecommendPostRankingId() {
  let queryResult = await RunSingleSQL(`
  WITH post_group as
  (
    WITH review_group as
    (
      SELECT review.*, COUNT(img)
      FROM "ITEM_REVIEW" review
      INNER JOIN "ITEM_REVIEW_IMAGE" img ON review.id = img."FK_reviewId"
      GROUP BY review.id
    )
    SELECT 
      post.*,
      COALESCE(SUM(review_group."purchaseCount"),0)*10 as purchase_score, 
      COALESCE(SUM(review_group."urlClickCount"),0)*0.5 as click_score,
      COALESCE(AVG(CHAR_LENGTH(review_group.review)),0)*0.05 as length_score,
      COALESCE(AVG(review_group.count),0)*1 as img_score
    FROM "RECOMMEND_POST" post
    INNER JOIN review_group ON review_group."FK_postId" = post.id
    GROUP BY post.id
  ),
  follower_count as
  (
    SELECT post_group.id, COUNT(follow.*)*4 as follower_score 
    FROM post_group 
    INNER JOIN "RECOMMEND_POST_FOLLOWER" follow ON follow."FK_postId" = post_group.id
    GROUP BY post_group.id
  ),
  comment_count as
  (
    SELECT post_group.id, COUNT(com.*)*3 as comment_score 
    FROM post_group 
    INNER JOIN "RECOMMEND_POST_COMMENT" com ON com."FK_postId" = post_group.id
    GROUP BY post_group.id
  )
  SELECT post_group.id, (post_group.purchase_score + post_group.click_score + post_group.length_score + post_group.img_score + COALESCE(follower_count.follower_score,0) + COALESCE(comment_count.comment_score,0)) as total_score FROM post_group
  LEFT JOIN follower_count ON post_group.id = follower_count.id
  LEFT JOIN comment_count ON post_group.id = comment_count.id
  ORDER BY total_score ASC
  `)
  return queryResult
}
