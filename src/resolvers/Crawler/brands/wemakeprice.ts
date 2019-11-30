import { getHtmlRequest, parseHtml } from "../util"
import { CrawledItemInfo } from "../type/ReturnType"
import { strip, formatUrl } from "../../Utils/stringUtil"

export async function crawlWeMakePrice(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)

  let itemname = parseHtml(htmlCode, "string", "value", ".title_box", ".deal_tit")
  let image = parseHtml(htmlCode, "string", "attribute", ".info_img", "img", "src")

  let price = parseHtml(htmlCode, "number", "value", ".price", ".normal")
  let saleprice = parseHtml(htmlCode, "number", "value", ".price", ".sale_price")
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
