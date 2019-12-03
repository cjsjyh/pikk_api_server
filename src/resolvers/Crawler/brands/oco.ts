import { getHtmlRequest, parseHtml } from "../util"
import { CrawledItemInfo } from "../type/ReturnType"
import { strip, formatUrl } from "../../Utils/stringUtil"

export async function crawlOco(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)

  let brand = parseHtml(htmlCode, "string", "value", "h5.en", "a")
  let itemname = parseHtml(htmlCode, "string", "value", ".detailInfoTop", "h3.en")
  let image = parseHtml(htmlCode, "string", "attribute", ".imgarea", ".img", "style")

  let regExp = /\(\'([^)]+)\'\)/
  let matches = regExp.exec(image)
  image = "https://www.ocokorea.com" + matches[1]

  let price = parseHtml(htmlCode, "number", "value", ".priceWrap", ".salePrice")
  let saleprice = parseHtml(htmlCode, "number", "value", ".priceWrap", ".price")

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
