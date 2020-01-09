import { RunSingleSQL, ExtractSelectionSet, ExtractFieldFromList, DeployImageBy4Versions } from "../Utils/promiseUtil"
import { ConvertListToString, IsNewImage } from "../Utils/stringUtil"
import * as ReturnType from "./type/ReturnType"
import { ItemInfoInput, ItemEditInfoInput, GroupEditInfo, VariationEditInfo } from "./type/ArgType"
import { ItemReviewInfoInput, ItemReviewEditInfoInput } from "../Review/type/ArgType"
import { GraphQLResolveInfo } from "graphql"
import { GetSubField } from "../Utils/promiseUtil"
var logger = require("../../tools/logger")

export async function EditItem(item: ItemEditInfoInput): Promise<boolean> {
  try {
    //edit item group info
    if (Object.prototype.hasOwnProperty.call(item, "groupInfo")) {
      let groupSql = GetItemGroupEditSql(item.groupInfo)
      await RunSingleSQL(`UPDATE "ITEM_GROUP" SET ${groupSql} WHERE id=${item.groupInfo.groupId}`)

      //edit brand info
      if (Object.prototype.hasOwnProperty.call(item.groupInfo, "brandId")) {
        let brandSql = GetBrandEditSql(item.groupInfo)
        await RunSingleSQL(`UPDATE "BRAND" SET ${brandSql} WHERE id=${item.groupInfo.brandId}`)
      }
    }

    //edit item variation info
    if (Object.prototype.hasOwnProperty.call(item, "variationInfo")) {
      //change item image
      if (IsNewImage(item.variationInfo.imageUrl)) item.variationInfo.imageUrl = await DeployImageBy4Versions(item.variationInfo.imageUrl)
      //update variation info
      let variationSql = await GetItemVariationEditSql(item.variationInfo)
      await RunSingleSQL(`UPDATE "ITEM_VARIATION" SET ${variationSql} WHERE id=${item.variationInfo.itemId}`)
    }
    return true
  } catch (e) {
    logger.warn("Failed to Edit Item")
    logger.error(e.stack)
    throw new Error("Failed to Edit Item")
  }
}

export function InsertItemForRecommendPost(argReview: ItemReviewInfoInput | ItemReviewEditInfoInput): Promise<{}> {
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
        //insert new brand
        if (arg.groupInfo.isNewBrand == true) {
          queryResult = await RunSingleSQL(`INSERT INTO "BRAND"("nameKor") VALUES ('${arg.groupInfo.brand}') RETURNING id`)
          brandId = queryResult[0].id
        } 
        //fetch brand id
        else {
          queryResult = await RunSingleSQL(`SELECT id FROM "BRAND" WHERE "nameEng"='${arg.groupInfo.brand}' OR "nameKor"='${arg.groupInfo.brand}'`)
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
        if (!Object.prototype.hasOwnProperty.call(arg.variationInfo, "groupId")) throw new Error("[Error] groupId not inserted!")
        groupId = arg.variationInfo.groupId
      }

      if (!arg.variationInfo.salePrice) arg.variationInfo.salePrice = null
      //deploy item image
      let deployImageUrl = ""
      try {
        deployImageUrl = await DeployImageBy4Versions(arg.variationInfo.imageUrl)
      } catch (e) {
        logger.warn("Failed to deploy item image: " + arg.variationInfo.imageUrl)
      }

      //create item variation
      queryResult = await RunSingleSQL(`INSERT INTO "ITEM_VARIATION"("name","imageUrl","purchaseUrl","salePrice","FK_itemGroupId")
        VALUES ('${arg.variationInfo.name}','${deployImageUrl}','${arg.variationInfo.purchaseUrl}',${arg.variationInfo.salePrice},${groupId}) RETURNING id`)
      resolve(queryResult[0].id)
    } catch (e) {
      logger.warn("Failed to Insert into ITEM_VARIATION")
      logger.error(e.stack)
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
      logger.error(e.stack)
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
    logger.warn("Failed to fetch simpleItemList")
    logger.error(e.stack)
    throw new Error("[ERROR] Failed to fetch simpleItemList")
  }
}

//get item info for simpleItemInfo
async function GetSimpleItemInfoByPostId(postList: any) {
  let postIdList = ExtractFieldFromList(postList, "id")
  let querySql = `
  WITH review as
  (
  SELECT
    "ITEM_REVIEW".id,
    "ITEM_REVIEW"."FK_itemId",
    "ITEM_REVIEW"."FK_postId" as "postId",
    "ITEM_REVIEW".order
  FROM "ITEM_REVIEW"
  WHERE "ITEM_REVIEW"."FK_postId" in (${ConvertListToString(postIdList)})
  ),
  item as
  (
  SELECT
    item_var."imageUrl",
    item_var."FK_itemGroupId",
    review."postId",
    review.id,
    review.order
  FROM review
  INNER JOIN "ITEM_VARIATION" item_var ON item_var.id = review."FK_itemId"
  ),
  gr as
  (
  SELECT
    item."imageUrl",
    item."postId",
    item.id,
    item.order,
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
  ORDER BY gr.order ASC
  `

  await GetSubField(postList, "", "postId", "simpleItemList", 1, querySql)
}

//fetch item info by id
export async function GetItemsById(idList: number[], formatSql, customFilter?, customSelector = "") {
  let filterSql = ""
  if (customFilter != null && customFilter != "") filterSql = customFilter
  else {
    if (idList.length != 0) filterSql = `and item_var.id IN (${ConvertListToString(idList)})`
    else filterSql = ""
  }

  let querySql = `
  SELECT
    item_full.*,
    "BRAND"."id" as "brandId",
    "BRAND"."nameKor" as "brandKor",
    "BRAND"."nameEng" as "brandEng"
  FROM
  (
    SELECT 
      ${customSelector}
      item_var.*,
      item_gr."id" as "groupId",
      item_gr."itemMinorType",
      item_gr."itemMajorType",
      item_gr."itemFinalType",
      item_gr."originalPrice",
      item_gr."FK_brandId",
      COALESCE(
        (
          SELECT ROUND(AVG(r."score")::numeric,2)
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

//find item ranking and return id
export async function GetItemIdInRanking(
  formatSql: string,
  primaryFilterSql: string,
  secondaryFilterSql: string = ""
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
      item_gr."itemFinalType",
      (
        CASE WHEN item_var."salePrice" is null 
        THEN item_gr."originalPrice" 
      ELSE item_var."salePrice" 
      END
      ) as price
    FROM "ITEM_VARIATION" item_var
    INNER JOIN "ITEM_GROUP" item_gr
    ON item_gr.id = item_var."FK_itemGroupId"
    ${primaryFilterSql}
  ),
  review_score as
  (
    SELECT 
      items.id as "itemId",
      items."itemMinorType",
      items."itemMajorType",
      items."itemFinalType",
      items."price",
      (SELECT COUNT(review_temp.score) FROM "ITEM_REVIEW" review_temp INNER JOIN items ON items.id = review_temp."FK_itemId" WHERE review_temp.score >=4)*${reviewScore} as reviewer_score,
      SUM(review."detailPageClickCount")*${detailPageClickScore} as detail_click,
      SUM(review."urlClickCount")*${purchaseLinkClikcScore} as purchase_click,
      SUM(review."purchaseCount")*${purchaseScore} as purchase_count
    FROM items
    INNER JOIN "ITEM_REVIEW" review ON items.id = review."FK_itemId"
    ${secondaryFilterSql}
    GROUP BY items.id, items."itemMinorType",items."itemMajorType",items."itemFinalType",items."price"
  )
  SELECT 
    review_score."itemId" as id, review_score.price,
    (review_score.reviewer_score + review_score.detail_click + review_score.purchase_click + review_score.purchase_count +
    (SELECT COUNT(*) as follow_count FROM "ITEM_FOLLOWER" follow WHERE follow."FK_itemId" = review_score."itemId")*${followScore}
     ) as "rankScore"
  FROM review_score ${formatSql}
  `

  let itemRank = await RunSingleSQL(querySql)

  return itemRank
}

export async function CombineItem(updateId: number, deleteIds: number[]) {
  try {
    let querySql = `
    WITH update_item as (
      UPDATE "ITEM_REVIEW" SET "FK_itemId" = ${updateId} WHERE "FK_itemId" IN (${ConvertListToString(deleteIds)})
    ),
    delete_item as (
      SELECT "FK_itemGroupId", id FROM "ITEM_VARIATION" WHERE id IN (${ConvertListToString(deleteIds)})
    )
    DELETE FROM "ITEM_GROUP" USING delete_item WHERE "ITEM_GROUP".id = delete_item."FK_itemGroupId"
    `
    await RunSingleSQL(querySql)
  } catch (e) {
    logger.error(e.stack)
  }
}

//find items with same name and combine them
export async function FindAndCombineDuplicateItem() {
  try {
    let findSql = `
    WITH grr as (
      SELECT var.name, gr."originalPrice" FROM "ITEM_VARIATION" var INNER JOIN "ITEM_GROUP" gr ON var."FK_itemGroupId"=gr.id
    ),
    aaa as (
      SELECT count(*) AS count_ , name, grr."originalPrice" FROM grr 
      GROUP BY "originalPrice", name HAVING count(*) > 1
      ORDER BY count_ DESC
    )
    SELECT * FROM "ITEM_VARIATION" var, aaa WHERE var.name = aaa.name
    ORDER BY var.name ASC, var.id DESC
    `
    let findResult = await RunSingleSQL(findSql)

    let itemTypeCount = 0
    let prevName = ""
    let headRecord
    let tailRecord = []
    for (let i = 0; i < findResult.length; i++) {
      //One set done
      if (prevName != findResult[i].name) {
        if (i != 0) {
          await CombineItem(headRecord, tailRecord)
          itemTypeCount += 1
        }
        headRecord = Number(findResult[i].id)
        prevName = findResult[i].name
        tailRecord.length = 0
      }
      //Still the same set
      else {
        tailRecord.push(Number(findResult[i].id))
      }
      //Merge last item set
      if (i == findResult.length - 1) {
        await CombineItem(headRecord, tailRecord)
        itemTypeCount += 1
      }
    }
    return `${findResult.length} Items merged into ${itemTypeCount}`
  } catch (e) {}
}

function GetBrandEditSql(itemGroup: GroupEditInfo): string {
  let isMultiple = false
  let resultSql = ""

  if (Object.prototype.hasOwnProperty.call(itemGroup, "brandId") && Object.prototype.hasOwnProperty.call(itemGroup, "brand")) {
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

async function GetItemVariationEditSql(itemVar: VariationEditInfo): Promise<string> {
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
    if (IsNewImage(itemVar.imageUrl)) itemVar.imageUrl = await DeployImageBy4Versions(itemVar.imageUrl)
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
