import { getHtmlRequest, parseHtml } from "./util"
import { CrawledItemInfo } from "./type/ReturnType"
import { strip } from "../Utils/stringUtil"

export async function crawlDunst(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)

  let price = parseHtml(htmlCode, "number", "value", ".price_box", ".sobi")
  let saleprice = parseHtml(htmlCode, "number", "value", ".price_box", ".price")
  let itemname = parseHtml(htmlCode, "string", "value", ".name_box")
  let image = parseHtml(htmlCode, "string", "attribute", ".xans-product-image", "img", "src")

  let result: CrawledItemInfo = {
    brandKor: "던스트",
    originalPrice: price,
    salePrice: saleprice,
    name: strip(itemname),
    imageUrl: image,
    purchaseUrl: sourceUrl
  }
  return result
}
