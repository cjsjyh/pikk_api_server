import { getHtmlRequest, parseHtml } from "./util"
import { CrawledItemInfo } from "./type/ReturnType"
import { strip, formatUrl } from "../Utils/stringUtil"

export async function crawlLlude(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)

  let brand = parseHtml(htmlCode, "string", "value", ".brand", "b")
  let price = parseHtml(htmlCode, "number", "value", ".cont", ".sobi")
  let saleprice = parseHtml(htmlCode, "number", "value", ".cont", ".price")
  let itemname = parseHtml(htmlCode, "string", "value", ".info_text", ".name")
  let image = parseHtml(htmlCode, "string", "attribute", ".xans-product .xans-product-image", "img", "src")
  if (price == saleprice) saleprice = null

  let result: CrawledItemInfo = {
    brandKor: brand,
    originalPrice: price,
    salePrice: saleprice,
    name: strip(itemname),
    imageUrl: [formatUrl(image)],
    purchaseUrl: sourceUrl,
    isEstimated: false
  }
  return result
}
