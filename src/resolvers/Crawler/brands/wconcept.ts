import { getHtmlRequest, parseHtml } from "../util"
import { CrawledItemInfo } from "../type/ReturnType"
import { strip, formatUrl } from "../../Utils/stringUtil"

export async function crawlWConcept(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)

  let brand = parseHtml(htmlCode, "string", "value", ".brand", "a")
  let itemname = parseHtml(htmlCode, "string", "value", ".h_group", ".product")
  let image = parseHtml(htmlCode, "string", "attribute", ".img_area", "img", "src")

  let price = parseHtml(htmlCode, "number", "value", ".normal", "em")
  let saleprice = parseHtml(htmlCode, "number", "value", ".sale", "em")

  if (price == null || price == 0) {
    price = saleprice
    saleprice = null
  }

  // let result22: CrawledItemInfo = {
  //   brandKor: brand,
  //   originalPrice: price,
  //   salePrice: saleprice,
  //   name: itemname,
  //   imageUrl: [image],
  //   purchaseUrl: sourceUrl,
  //   isEstimated: false
  // }
  // console.log(result22)

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
