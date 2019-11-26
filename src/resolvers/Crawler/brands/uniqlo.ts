import { getHtmlRequest, parseHtml } from "../util"
import { CrawledItemInfo } from "../type/ReturnType"
import { strip, formatUrl } from "../../Utils/stringUtil"

export async function crawlUniqlo(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)

  let itemname = parseHtml(htmlCode, "string", "value", "#goodsNmArea")
  let image = parseHtml(htmlCode, "string", "attribute", "#prodImgDefault", "img", "src")

  let price = parseHtml(htmlCode, "number", "value", "#salePrice")

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
    brandKor: "유니클로",
    originalPrice: price,
    salePrice: null,
    name: strip(itemname),
    imageUrl: [formatUrl(image)],
    purchaseUrl: sourceUrl,
    isEstimated: false
  }
  return result
}