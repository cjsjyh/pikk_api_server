import { getHtmlRequest, parseHtml } from "./util"
import { CrawledItemInfo } from "./type/ReturnType"
import { strip } from "../Utils/stringUtil"

export async function crawlCoor(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)

  let price = parseHtml(htmlCode, "number", "attribute", "#price", "", "value")
  let saleprice = parseHtml(htmlCode, "number", "attribute", "#disprice", "", "value")
  let itemname = parseHtml(htmlCode, "string", "value", ".info", ".tit-prd")
  let image = parseHtml(htmlCode, "string", "attribute", ".prd-detail", "img", "src", 1)

  let result: CrawledItemInfo = {
    brandKor: "쿠어",
    originalPrice: price,
    salePrice: saleprice,
    name: strip(itemname),
    imageUrl: [image],
    purchaseUrl: sourceUrl
  }
  return result
}
