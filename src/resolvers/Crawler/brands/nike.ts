import { getHtmlRequest, parseHtml, getHtmlAxios } from "../util"
import { CrawledItemInfo } from "../type/ReturnType"
import { strip, formatUrl } from "../../Utils/stringUtil"

export async function crawlNike(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlAxios(sourceUrl)
  htmlCode = htmlCode.data

  let itemname = parseHtml(htmlCode, "string", "value", ".title-wrap", ".tit")
  let image = parseHtml(htmlCode, "string", "attribute", ".prd-gutter", "img", "src")

  let price = parseHtml(htmlCode, "number", "value", ".uk-float-right", ".price-sale")
  let saleprice = parseHtml(htmlCode, "number", "value", ".price", "strong")

  if (price == null || price == 0) {
    price = saleprice
    saleprice = null
  }

  let result22: CrawledItemInfo = {
    brandKor: "나이키",
    originalPrice: price,
    salePrice: saleprice,
    name: itemname,
    imageUrl: [image],
    purchaseUrl: sourceUrl,
    isEstimated: false
  }
  console.log(result22)

  let result: CrawledItemInfo = {
    brandKor: "나이키",
    originalPrice: price,
    salePrice: saleprice,
    name: strip(itemname),
    imageUrl: [formatUrl(image)],
    purchaseUrl: sourceUrl,
    isEstimated: false
  }
  return result
}
