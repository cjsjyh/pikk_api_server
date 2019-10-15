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
          queryResult = RunSingleSQL(
            `INSERT INTO "BRAND"("nameEng") VALUE('${arg.groupInfo.brand}') RETURNING id`
          )
          brandId = queryResult.id
        } else {
          queryResult = RunSingleSQL(
            `SELECT id FROM "BRAND" WHERE "nameEng"=${arg.groupInfo.brand} OR "nameKor"=${arg.groupInfo.brand}`
          )
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
        queryResult = RunSingleSQL(
          `SELECT id FROM "ITEM_GROUP" WHERE id = ${arg.variationInfo.groupId}`
        )
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

export function GetItems(sql: string): Promise<ReturnType.ItemInfo[]> {
  return new Promise(async (resolve, reject) => {
    try {
      let queryResult = await RunSingleSQL(sql)
      let itemResult: ReturnType.ItemInfo[] = queryResult
      await Promise.all(
        itemResult.map(async (item: ReturnType.ItemInfo) => {
          queryResult = await RunSingleSQL(
            `SELECT COUNT(*) FROM "ITEM_FOLLOWER" WHERE "FK_itemId"=${item.id}`
          )
          item.pickCount = queryResult[0].count
          //item.averageScore = item.avg
          ItemMatchGraphQL(item)
        })
      )
      resolve(itemResult)
    } catch (e) {
      throw new Error("Get Item Failed!")
    }
  })
}

export function FetchItemsForReview(review: any): Promise<{}> {
  return new Promise(async (resolve, reject) => {
    try {
      let sql = `
      WITH aaa as (SELECT * FROM "ITEM_VARIATION" WHERE id=${review.FK_itemId}),
      bbb as (SELECT aaa.*,
        "ITEM_GROUP"."itemMinorType",  
        "ITEM_GROUP"."itemMajorType",
        "ITEM_GROUP"."originalPrice",
        "ITEM_GROUP"."FK_brandId"
        FROM "ITEM_GROUP" INNER JOIN aaa ON aaa."FK_itemGroupId" = "ITEM_GROUP".id)
      SELECT bbb.*, "BRAND"."nameKor", "BRAND"."nameEng" FROM "BRAND" INNER JOIN bbb on "BRAND".id = bbb."FK_brandId"
      `
      let queryResult = await GetItems(sql)
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
      await GetItemByPostId(postResult)
    }
  } catch (e) {
    console.log("[ERROR] Failed to fetch simpleItemList")
    console.log(e)
    throw new Error("[ERROR] Failed to fetch simpleItemList")
  }
}

async function GetItemByPostId(postList: any) {
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

function ItemMatchGraphQL(obj: any) {
  obj.brandKor = obj.nameKor
  obj.brandEng = obj.nameEng
}
