import { getHtmlRequest, parseHtml } from "../util"
import { CrawledItemInfo } from "../type/ReturnType"
import { strip, formatUrl } from "../../Utils/stringUtil"

export async function crawlEbay(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)

  let price = parseHtml(htmlCode, "number", "value", "#mm-saleOrgPrc")
  let saleprice = parseHtml(htmlCode, "number", "value", "#mm-saleDscPrc")
  if (price == null) {
    price = parseHtml(htmlCode, "number", "value", "#prcIsum")
  }

  let itemname = parseHtml(htmlCode, "string", "value", "#itemTitle")
  itemname = itemname.replace("Details about", "")
  let image = parseHtml(htmlCode, "string", "attribute", "#mainImgHldr", "#icImg", "src")

  //   let tempResult: CrawledItemInfo = {
  //     brandKor: null,
  //     originalPrice: price,
  //     salePrice: saleprice,
  //     name: itemname,
  //     imageUrl: image,
  //     purchaseUrl: sourceUrl
  //   }

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
