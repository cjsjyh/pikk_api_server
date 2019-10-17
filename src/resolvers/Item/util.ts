import { RunSingleSQL, ExtractSelectionSet, ExtractFieldFromList } from "../Utils/promiseUtil"
import { ConvertListToString } from "../Utils/stringUtil"
import * as ReturnType from "./type/ReturnType"
import { ItemInfoInput } from "./type/ArgType"
import { ItemReviewInfoInput } from "../Review/type/ArgType"
import { GraphQLResolveInfo } from "graphql"
import { GetSubField } from "../Review/util"

export function InsertItemForRecommendPost(argReview: ItemReviewInfoInput): Promise<{}> {
  return new Promise(async (resolve, reject) => {
    try {
      argReview.itemId = await InsertItem(argReview.item)
      resolve()
    } catch (e) {
      reject()
    }
  })
}

export function InsertItem(arg: ItemInfoInput): Promise<number> {
  return new Promise(async (resolve, reject) => {
    try {
      let queryResult
      let groupId
      if (arg.createItemLevel == "GROUP") {
        let brandId
        //Find Brand Id for the group
        if (arg.groupInfo.isNewBrand == true) {
          queryResult = RunSingleSQL(`INSERT INTO "BRAND"("nameEng") VALUE('${arg.groupInfo.brand}') RETURNING id`)
          brandId = queryResult.id
        } else {
          queryResult = RunSingleSQL(`SELECT id FROM "BRAND" WHERE "nameEng"=${arg.groupInfo.brand} OR "nameKor"=${arg.groupInfo.brand}`)
          brandId = queryResult.id
        }

        //Create new Group and save Id
        queryResult = RunSingleSQL(`
          INSERT INTO "ITEM_GROUP" ("itemMinorType","itemMajorType","originalPrice","sourceWebsite","FK_brandId") 
          VALUES ('
          ${arg.groupInfo.itemMinorType}','${arg.groupInfo.itemMajorType}',
          ${arg.groupInfo.originalPrice},'${arg.groupInfo.sourceWebsite}',${brandId})
          RETURNING id`)
        groupId = queryResult.id
      } else {
        //Find Group Id of this Item
        queryResult = RunSingleSQL(`SELECT id FROM "ITEM_GROUP" WHERE id = ${arg.variationInfo.groupId}`)
        groupId = queryResult.id
      }

      //Insert Variation
      queryResult = RunSingleSQL(`INSERT INTO "ITEM_VARIATION"("name","imageUrl","purchaseUrl","salePrice","FK_itemGroupId")
        VALUES('${arg.variationInfo.name}','${arg.variationInfo.imageUrl}','${arg.variationInfo.purchaseUrl}','${arg.variationInfo.salePrice}','${groupId}') RETURNING id`)

      console.log(`Item ${arg.variationInfo.name} created`)
      resolve(queryResult.id)
    } catch (e) {
      console.log("[Error] Failed to Insert into ITEM_VARIATION")
      console.log(e)
      reject()
    }
  })
}

export function FetchItemsForReview(review: any): Promise<{}> {
  return new Promise(async (resolve, reject) => {
    try {
      let queryResult = await GetItemsById([review.FK_itemId], "")
      review.itemInfo = queryResult[0]
      resolve()
    } catch (e) {
      reject()
    }
  })
}

export async function GetSimpleItemListByPostList(postResult: any, info: GraphQLResolveInfo) {
  try {
    let selectionSet: string[] = ExtractSelectionSet(info.fieldNodes[0])

    if (selectionSet.includes("simpleItemList")) {
      await GetSimpleItemInfoByPostId(postResult)
    }
  } catch (e) {
    console.log("[ERROR] Failed to fetch simpleItemList")
    console.log(e)
    throw new Error("[ERROR] Failed to fetch simpleItemList")
  }
}

async function GetSimpleItemInfoByPostId(postList: any) {
  let postIdList = ExtractFieldFromList(postList, "id")
  let querySql = `
  WITH review as
  (
    SELECT 
      "ITEM_REVIEW"."FK_itemId",
      "ITEM_REVIEW"."FK_postId" as "postId"
    FROM "ITEM_REVIEW" 
    WHERE "ITEM_REVIEW"."FK_postId" in (${ConvertListToString(postIdList)})
    ),
    item as
  (
    SELECT 
      item_var."imageUrl", 
      item_var."FK_itemGroupId",
      review."postId"
    FROM review
    INNER JOIN "ITEM_VARIATION" item_var ON item_var.id = review."FK_itemId"
  ),
  gr as
  (
    SELECT 
      item."imageUrl",
      item."postId",
      item_gr."FK_brandId"
    FROM item
    INNER JOIN "ITEM_GROUP" item_gr ON item."FK_itemGroupId" = item_gr.id
    )
  SELECT
  "BRAND"."nameKor" as "brandKor",
  "BRAND"."nameEng"as "brandEng",
  gr."imageUrl",
	  gr."postId",
    rank() OVER (PARTITION BY gr."postId")
    FROM gr
    INNER JOIN "BRAND" ON "BRAND".id = gr."FK_brandId"
    `
  await GetSubField(postList, "", "postId", "simpleItemList", 1, querySql)
}

export async function GetItemsById(idList: number[], formatSql, customFilter?) {
  let filterSql = ""
  if (customFilter != null && customFilter != "") filterSql = customFilter
  else {
    if (idList.length != 0) filterSql = `and item_var.id IN (${ConvertListToString(idList)})`
    else filterSql = ""
  }

  let querySql = `
  SELECT
    item_full.*,
    "BRAND"."nameKor" as "brandKor",
    "BRAND"."nameEng" as "brandEng"
  FROM
  (
    SELECT 
      item_var.*,
      item_group."itemMinorType",
      item_group."itemMajorType",
      item_group."itemFinalType",
      item_group."originalPrice",
      item_group."FK_brandId",
      COALESCE(
        (
          SELECT AVG(r.score)
          FROM "ITEM_REVIEW" r
          WHERE r."FK_itemId" = item_var.id
        )
      ,0) as "averageScore",
      (
        SELECT COUNT(*) as "pickCount"
        FROM "ITEM_FOLLOWER" f
        WHERE f."FK_itemId" = item_var.id
      )
    FROM 
    "ITEM_VARIATION" item_var
    INNER JOIN "ITEM_GROUP" as item_group ON item_var."FK_itemGroupId" = item_group.id ${filterSql}
  ) as item_full
  INNER JOIN "BRAND" on "BRAND".id = item_full."FK_brandId" ${formatSql}
  `
  let itemInfo = await RunSingleSQL(querySql)

  return itemInfo
}

export async function GetItemIdInRanking(): Promise<ReturnType.ItemInfo[]> {
  let reviewScore = 10
  let purchaseScore = 10
  let detailPageClickScore = 0.5
  let purchaseLinkClikcScore = 1
  let followScore = 1

  let querySql = `
  WITH review_score as
  (
    SELECT 
      review."FK_itemId" as "itemId",
      COUNT(review.score)*${reviewScore} as reviewer_score,
      SUM(review."detailPageClickCount")*${detailPageClickScore} as detail_click,
      SUM(review."urlClickCount")*${purchaseLinkClikcScore} as purchase_click,
      SUM(review."purchaseCount")*${purchaseScore} as purchase_count
    FROM "ITEM_VARIATION" item_var
    INNER JOIN "ITEM_REVIEW" review
    ON item_var.id = review."FK_itemId"
    WHERE review.score >= 4
    GROUP BY review."FK_itemId"
  )
  SELECT 
    review_score."itemId" as id,
    (review_score.reviewer_score + review_score.detail_click + review_score.purchase_click + review_score.purchase_count +
    (SELECT COUNT(*) as follow_count FROM "ITEM_FOLLOWER" follow WHERE follow."FK_itemId" = review_score."itemId")*${followScore}
     ) as final_score
  FROM review_score ORDER BY final_score DESC LIMIT 100
  `
  let ItemRank = await RunSingleSQL(querySql)

  return ItemRank
}
