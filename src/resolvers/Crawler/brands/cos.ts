import { getHtmlRequest, parseHtml } from "../util"
import { CrawledItemInfo } from "../type/ReturnType"
import { strip, formatUrl } from "../../Utils/stringUtil"

export async function crawlCos(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)

  let itemname = parseHtml(htmlCode, "string", "value", "#product-detail-name")
  let image = parseHtml(htmlCode, "string", "attribute", "#gallery-product-0", "", "src")

  let price = parseHtml(htmlCode, "number", "value", "#priceValue")
  let saleprice = null

  let result: CrawledItemInfo = {
    brandKor: null,
    originalPrice: price,
    salePrice: saleprice,
    name: strip(itemname),
    imageUrl: [formatUrl(image)],
    purchaseUrl: sourceUrl,
    isEstimated: false
  }
  return result
}
