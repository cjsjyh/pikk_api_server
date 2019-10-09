import { RunSingleSQL, UploadImage } from "../Util/util"
import * as ReturnType from "./type/ReturnType"
import { ItemInfoInput } from "./type/ArgType"
import { ItemReviewInfoInput } from "../Review/type/ArgType"

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

export function GetItems(sql: string): Promise<ReturnType.ItemInfo[]> {
  return new Promise(async (resolve, reject) => {
    let queryResult = await RunSingleSQL(sql)
    let itemResult: ReturnType.ItemInfo[] = queryResult
    await Promise.all(
      itemResult.map(async (item: ReturnType.ItemInfo) => {
        queryResult = await RunSingleSQL(`SELECT COUNT(*) FROM "ITEM_FOLLOWER" where "FK_itemId"=${item.id}`)
        item.pickCount = queryResult[0].count
      })
    )

    itemResult.map((item: ReturnType.ItemInfo) => {
      ItemMatchGraphQL(item)
    })
    resolve(itemResult)
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

function ItemMatchGraphQL(obj: any) {
  obj.brandKor = obj.nameKor
  obj.brandEng = obj.nameEng
}
