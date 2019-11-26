import { getHtmlRequest, parseHtml } from "../util"
import { CrawledItemInfo } from "../type/ReturnType"
import { strip, formatUrl } from "../../Utils/stringUtil"
const cheerio = require("cheerio")

export async function crawlLfmall(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)

  let price = parseHtml(htmlCode, "number", "value", ".originPrice", "strike")
  let saleprice = parseHtml(htmlCode, "number", "value", ".price-sale", "b")
  if (price == null && saleprice != 0) {
    price = saleprice
    saleprice = null
  }

  let itemname = parseHtml(htmlCode, "string", "value", ".prod-dtl-title", ".prod-name")
  let image = parseHtml(htmlCode, "string", "attribute", ".pic", "img", "src")

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
