import { getHtmlRequest, parseHtml } from "./util"
import { CrawledItemInfo } from "./type/ReturnType"
import { strip } from "../Utils/stringUtil"

export async function crawlDrawFit(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)

  let price = parseHtml(htmlCode, "number", "value", "#span_product_price_custom")
  let saleprice = parseHtml(htmlCode, "number", "value", "#span_product_price_text")
  let itemname = parseHtml(htmlCode, "string", "value", ".infoArea", "h2")
  let image = parseHtml(htmlCode, "string", "attribute", ".xans-product-image", "img", "src")

  if (price == null) {
    price = saleprice
    saleprice = null
  }

  let result: CrawledItemInfo = {
    brandKor: "드로우핏",
    originalPrice: price,
    salePrice: saleprice,
    name: strip(itemname),
    imageUrl: [image],
    purchaseUrl: sourceUrl
  }
  return result
}
