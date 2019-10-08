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

export function GetSingleItem(id: number): Promise<ReturnType.ItemInfo> {
  return new Promise(async (resolve, reject) => {
    let queryResult = await RunSingleSQL(`
    WITH aaa as (SELECT * FROM "ITEM_VARIATION" WHERE id=${id}),
    bbb as (SELECT aaa.*,
      "ITEM_GROUP"."itemMinorType",  
      "ITEM_GROUP"."itemMajorType",
      "ITEM_GROUP"."originalPrice",
      "ITEM_GROUP"."FK_brandId"
      FROM "ITEM_GROUP" INNER JOIN aaa ON aaa."FK_itemGroupId" = "ITEM_GROUP".id)
    SELECT bbb.*, "BRAND"."nameKor", "BRAND"."nameEng" FROM "BRAND" INNER JOIN bbb on "BRAND".id = bbb."FK_brandId"
    `)
    console.log(queryResult)
    ItemMatchGraphQL(queryResult[0])
    resolve(queryResult[0])
  })
}

export function FetchItemsForReview(review: any): Promise<{}> {
  return new Promise(async (resolve, reject) => {
    try {
      let queryResult = await GetSingleItem(review.FK_itemId)
      review.itemInfo = queryResult
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
