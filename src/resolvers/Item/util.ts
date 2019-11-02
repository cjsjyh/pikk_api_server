import {
  RunSingleSQL,
  ExtractSelectionSet,
  ExtractFieldFromList,
  UploadImage
} from "../Utils/promiseUtil"
import { ConvertListToString, logWithDate } from "../Utils/stringUtil"
import * as ReturnType from "./type/ReturnType"
import { ItemInfoInput, ItemEditInfoInput, GroupEditInfo, VariationEditInfo } from "./type/ArgType"
import { ItemReviewInfoInput, ItemReviewEditInfoInput } from "../Review/type/ArgType"
import { GraphQLResolveInfo } from "graphql"
import { GetSubField } from "../Review/util"

export async function EditItem(item: ItemEditInfoInput): Promise<boolean> {
  try {
    if (Object.prototype.hasOwnProperty.call(item, "groupInfo")) {
      let groupSql = GetItemGroupEditSql(item.groupInfo)
      await RunSingleSQL(`UPDATE "ITEM_GROUP" SET ${groupSql} WHERE id=${item.groupInfo.groupId}`)

      if (Object.prototype.hasOwnProperty.call(item.groupInfo, "brandId")) {
        let brandSql = GetBrandEditSql(item.groupInfo)
        await RunSingleSQL(`UPDATE "BRAND" SET ${brandSql} WHERE id=${item.groupInfo.brandId}`)
      }
    }

    if (Object.prototype.hasOwnProperty.call(item, "variationInfo")) {
      let variationSql = GetItemVariationEditSql(item.variationInfo)
      await RunSingleSQL(
        `UPDATE "ITEM_VARIATION" SET ${variationSql} WHERE id=${item.variationInfo.itemId}`
      )
    }
    return true
  } catch (e) {
    logWithDate("[Error] Failed to Edit Item")
    logWithDate(e)
    return false
  }
}

export function InsertItemForRecommendPost(
  argReview: ItemReviewInfoInput | ItemReviewEditInfoInput
): Promise<{}> {
  return new Promise(async (resolve, reject) => {
    try {
      argReview.itemId = await InsertItem(argReview.item)
      resolve()
    } catch (e) {
      reject()
    }
  })
}

export function InsertItem(arg: ItemInfoInput | ItemEditInfoInput): Promise<number> {
  return new Promise(async (resolve, reject) => {
    try {
      let queryResult
      let groupId
      if (arg.createItemLevel == "GROUP") {
        let brandId
        //Find Brand Id for the group
        if (arg.groupInfo.isNewBrand == true) {
          queryResult = await RunSingleSQL(
            `INSERT INTO "BRAND"("nameKor") VALUES ('${arg.groupInfo.brand}') RETURNING id`
          )
          brandId = queryResult[0].id
        } else {
          queryResult = await RunSingleSQL(
            `SELECT id FROM "BRAND" WHERE "nameEng"='${arg.groupInfo.brand}' OR "nameKor"='${arg.groupInfo.brand}'`
          )
          brandId = queryResult[0].id
        }
        //Create new Group and save Id
        queryResult = await RunSingleSQL(`
          INSERT INTO "ITEM_GROUP" ("itemFinalType","itemMinorType","itemMajorType","originalPrice","sourceWebsite","FK_brandId") 
          VALUES (
          '${arg.groupInfo.itemFinalType}','${arg.groupInfo.itemMinorType}','${arg.groupInfo.itemMajorType}',
          ${arg.groupInfo.originalPrice},'${arg.groupInfo.sourceWebsite}',${brandId})
          RETURNING id`)
        groupId = queryResult[0].id
      } else {
        //Find Group Id of this Item
        if (!Object.prototype.hasOwnProperty.call(arg.variationInfo, "groupId"))
          throw new Error("[Error] groupId not inserted!")
        groupId = arg.variationInfo.groupId
      }
      //Insert Variation
      if (arg.variationInfo.salePrice === undefined) arg.variationInfo.salePrice = null

      queryResult = await RunSingleSQL(`INSERT INTO "ITEM_VARIATION"("name","imageUrl","purchaseUrl","salePrice","FK_itemGroupId")
        VALUES ('${arg.variationInfo.name}','${arg.variationInfo.imageUrl}','${arg.variationInfo.purchaseUrl}',${arg.variationInfo.salePrice},${groupId}) RETURNING id`)
      resolve(queryResult[0].id)
    } catch (e) {
      logWithDate("[Error] Failed to Insert into ITEM_VARIATION")
      logWithDate(e)
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
    logWithDate("[ERROR] Failed to fetch simpleItemList")
    logWithDate(e)
    throw new Error("[ERROR] Failed to fetch simpleItemList")
  }
}

async function GetSimpleItemInfoByPostId(postList: any) {
  let postIdList = ExtractFieldFromList(postList, "id")
  let querySql = `
  WITH review as
  (
  SELECT
    "ITEM_REVIEW".id,
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
    review."postId",
    review.id
  FROM review
  INNER JOIN "ITEM_VARIATION" item_var ON item_var.id = review."FK_itemId"
  ),
  gr as
  (
  SELECT
    item."imageUrl",
    item."postId",
    item.id,
    item_gr."FK_brandId"
  FROM item
  INNER JOIN "ITEM_GROUP" item_gr ON item."FK_itemGroupId" = item_gr.id
  )
  SELECT
    "BRAND"."nameKor" as "brandKor",
    "BRAND"."nameEng"as "brandEng",
    gr."imageUrl",
    gr."postId"
  FROM gr
  INNER JOIN "BRAND" ON "BRAND".id = gr."FK_brandId"
  ORDER BY gr.id ASC
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
      item_gr."itemMinorType",
      item_gr."itemMajorType",
      item_gr."itemFinalType",
      item_gr."originalPrice",
      item_gr."FK_brandId",
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
    INNER JOIN "ITEM_GROUP" as item_gr ON item_var."FK_itemGroupId" = item_gr.id ${filterSql}
  ) as item_full
  INNER JOIN "BRAND" on "BRAND".id = item_full."FK_brandId" ${formatSql}
  `
  let itemInfo = await RunSingleSQL(querySql)

  return itemInfo
}

export async function GetItemIdInRanking(
  filterSql: string,
  formatSql: string
): Promise<ReturnType.ItemInfo[]> {
  let reviewScore = 10
  let purchaseScore = 10
  let detailPageClickScore = 0.5
  let purchaseLinkClikcScore = 1
  let followScore = 1

  let querySql = `
  WITH items as (
    SELECT
      item_var.*,
      item_gr."itemMajorType",
      item_gr."itemMinorType",
      item_gr."itemFinalType"
    FROM "ITEM_VARIATION" item_var
    INNER JOIN "ITEM_GROUP" item_gr
    ON item_gr.id = item_var."FK_itemGroupId"
    ${filterSql}
  ),
  review_score as
  (
    SELECT 
      items.id as "itemId",
      items."itemMinorType",
      items."itemMajorType",
      items."itemFinalType",
      (SELECT COUNT(review_temp.score) FROM "ITEM_REVIEW" review_temp INNER JOIN items ON items.id = review_temp."FK_itemId" WHERE review_temp.score >=4)*${reviewScore} as reviewer_score,
      SUM(review."detailPageClickCount")*${detailPageClickScore} as detail_click,
      SUM(review."urlClickCount")*${purchaseLinkClikcScore} as purchase_click,
      SUM(review."purchaseCount")*${purchaseScore} as purchase_count
    FROM items
    INNER JOIN "ITEM_REVIEW" review
    ON items.id = review."FK_itemId"
    GROUP BY items.id, items."itemMinorType",items."itemMajorType",items."itemFinalType"
  )
  SELECT 
    review_score."itemId" as id,
    (review_score.reviewer_score + review_score.detail_click + review_score.purchase_click + review_score.purchase_count +
    (SELECT COUNT(*) as follow_count FROM "ITEM_FOLLOWER" follow WHERE follow."FK_itemId" = review_score."itemId")*${followScore}
     ) as final_score
  FROM review_score ORDER BY final_score DESC, review_score."itemId" DESC ${formatSql}
  `
  let ItemRank = await RunSingleSQL(querySql)

  return ItemRank
}

function GetBrandEditSql(itemGroup: GroupEditInfo): string {
  let isMultiple = false
  let resultSql = ""

  if (
    Object.prototype.hasOwnProperty.call(itemGroup, "brandId") &&
    Object.prototype.hasOwnProperty.call(itemGroup, "brand")
  ) {
    resultSql += ` "nameKor" = '${itemGroup.brand}'`
    isMultiple = true
  }

  return resultSql
}

function GetItemGroupEditSql(itemGroup: GroupEditInfo): string {
  let isMultiple = false
  let resultSql = ""

  if (Object.prototype.hasOwnProperty.call(itemGroup, "originalPrice")) {
    if (isMultiple) resultSql += ", "
    resultSql += ` "originalPrice" = ${itemGroup.originalPrice}`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(itemGroup, "itemMinorType")) {
    if (isMultiple) resultSql += ", "
    resultSql += ` "itemMinorType" = '${itemGroup.itemMinorType}'`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(itemGroup, "itemMajorType")) {
    if (isMultiple) resultSql += ", "
    resultSql += ` "itemMajorType" = '${itemGroup.itemMajorType}'`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(itemGroup, "itemFinalType")) {
    if (isMultiple) resultSql += ", "
    resultSql += ` "itemFinalType" = '${itemGroup.itemFinalType}'`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(itemGroup, "sourceWebsite")) {
    if (isMultiple) resultSql += ", "
    resultSql += ` "sourceWebsite" = '${itemGroup.sourceWebsite}'`
    isMultiple = true
  }

  return resultSql
}

function GetItemVariationEditSql(itemVar: VariationEditInfo): string {
  let isMultiple = false
  let resultSql = ""

  if (Object.prototype.hasOwnProperty.call(itemVar, "name")) {
    if (isMultiple) resultSql += ", "
    resultSql += ` "name" = '${itemVar.name}'`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(itemVar, "salePrice")) {
    if (isMultiple) resultSql += ", "
    resultSql += ` "salePrice" = ${itemVar.salePrice}`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(itemVar, "imageUrl")) {
    if (isMultiple) resultSql += ", "
    resultSql += ` "imageUrl" = '${itemVar.imageUrl}'`
    isMultiple = true
  }

  if (Object.prototype.hasOwnProperty.call(itemVar, "purchaseUrl")) {
    if (isMultiple) resultSql += ", "
    resultSql += ` "purchaseUrl" = '${itemVar.purchaseUrl}'`
    isMultiple = true
  }

  return resultSql
}
