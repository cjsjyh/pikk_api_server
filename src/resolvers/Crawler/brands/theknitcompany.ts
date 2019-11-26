import { getHtmlRequest, parseHtml } from "../util"
import { CrawledItemInfo } from "../type/ReturnType"
import { strip, formatUrl } from "../../Utils/stringUtil"

export async function crawlTheKnitCompany(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)
  let price = parseHtml(htmlCode, "number", "value", "#span_product_price_custom")
  let saleprice = parseHtml(htmlCode, "number", "value", "#span_product_price_text")
  let itemname = parseHtml(htmlCode, "string", "value", "title")
  let image = parseHtml(htmlCode, "string", "attribute", ".xans-product-image", "img", "src")

  if (price == null) {
    price = saleprice
    saleprice = null
  }
  itemname = itemname.split("-")[0]

  let result: CrawledItemInfo = {
    brandKor: "더니트컴퍼니",
    originalPrice: price,
    salePrice: saleprice,
    name: strip(itemname),
    imageUrl: [formatUrl(image)],
    purchaseUrl: sourceUrl,
    isEstimated: false
  }
  return result
}
