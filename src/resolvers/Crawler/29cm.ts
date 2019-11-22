import { getHtmlRequest, parseHtml } from "./util"
import { CrawledItemInfo } from "./type/ReturnType"
import { strip, formatUrl } from "../Utils/stringUtil"

export async function crawl29cm(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)

  //Mistyped class name
  let brand = parseHtml(htmlCode, "string", "value", ".brnad_link", "_ngcontent-c36")
  let price = parseHtml(htmlCode, "number", "value", ".o", ".num")
  let saleprice = parseHtml(htmlCode, "number", "value", ".s", ".num")
  if (saleprice == 0) price = parseHtml(htmlCode, "number", "value", ".p", ".num")

  let itemname = parseHtml(htmlCode, "string", "value", ".prd_info", ".name")
  let image = parseHtml(htmlCode, "string", "attribute", ".imgbx .imgbx2", "img", "src")

  let result: CrawledItemInfo = {
    brandKor: brand,
    originalPrice: price,
    salePrice: saleprice,
    name: strip(itemname),
    imageUrl: [formatUrl(image)],
    purchaseUrl: sourceUrl
  }
  return result
}
