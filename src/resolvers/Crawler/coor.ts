import { getHtml, parseHtml } from "./util"
import { CrawledItemInfo } from "./type/ReturnType"

export async function crawlCoor(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtml(sourceUrl)

  let coor_price = parseHtml(htmlCode, "number", "attribute", "#price", "", "value")
  let coor_saleprice = parseHtml(htmlCode, "number", "attribute", "#disprice", "", "value")
  let coor_itemname = parseHtml(htmlCode, "string", "value", ".info", ".tit-prd")
  let coor_image = parseHtml(htmlCode, "string", "attribute", ".prd-detail", "img", "src", 1)

  let result: CrawledItemInfo = {
    brandKor: "쿠어",
    originalPrice: coor_price,
    salePrice: coor_saleprice,
    name: coor_itemname,
    imageUrl: coor_image,
    purchaseUrl: sourceUrl
  }
  return result
}
