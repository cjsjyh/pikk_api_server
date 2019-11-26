import { getHtmlRequest, parseHtml } from "../util"
import { CrawledItemInfo } from "../type/ReturnType"
import { strip, formatUrl, convertToWon } from "../../Utils/stringUtil"

export async function crawlMatchesFashion(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)

  let brand = parseHtml(htmlCode, "string", "value", ".pdp-headline", "a")
  let itemname = parseHtml(htmlCode, "string", "value", ".pdp-headline", ".pdp-description")
  let image = parseHtml(htmlCode, "string", "attribute", ".gallery-panel__main-image-carousel", "img", "data-lazy")

  let price = parseHtml(htmlCode, "number", "value", ".pdp-price", "strike")
  let saleprice = parseHtml(htmlCode, "number", "value", ".pdp-price__hilite")

  if (price == null) price = parseHtml(htmlCode, "number", "value", ".pdp-price")

  let result: CrawledItemInfo = {
    brandKor: brand,
    originalPrice: convertToWon(price, "pound"),
    salePrice: convertToWon(saleprice, "pound"),
    name: strip(itemname),
    imageUrl: [formatUrl(image)],
    purchaseUrl: sourceUrl,
    isEstimated: true
  }
  return result
}
