import { getHtmlRequest, parseHtml } from "../util"
import { CrawledItemInfo } from "../type/ReturnType"
import { strip, formatUrl } from "../../Utils/stringUtil"

export async function crawlWeMakePrice(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)

  let brand = parseHtml(htmlCode, "string", "value", "tbody", ".inner", "", 3)
  let itemname = parseHtml(htmlCode, "string", "value", ".prd_name", "strong")
  let image = parseHtml(htmlCode, "string", "attribute", ".img_va", "img", "src")

  let price = parseHtml(htmlCode, "number", "value", ".original", ".thm")
  let saleprice = parseHtml(htmlCode, "number", "value", ".info_cost", ".thm")
  if (price == null && saleprice != 0) {
    price = saleprice
    saleprice = null
  }

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
