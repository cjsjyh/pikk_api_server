import { getHtmlRequest, parseHtml } from "../util"
import { CrawledItemInfo } from "../type/ReturnType"
import { strip, formatUrl } from "../../Utils/stringUtil"

export async function crawlHandM(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)

  let itemname = parseHtml(htmlCode, "string", "value", ".name-price", ".product-item-headline")
  let image = parseHtml(htmlCode, "string", "attribute", ".product-detail-main-image-container", "img", "src")

  let price = parseHtml(htmlCode, "number", "value", ".product-item-price", ".price-value-original")
  let saleprice = parseHtml(htmlCode, "number", "value", ".product-item-price", ".price-value")

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
    brandKor: "H&M",
    originalPrice: price,
    salePrice: saleprice,
    name: strip(itemname),
    imageUrl: [formatUrl(image)],
    purchaseUrl: sourceUrl,
    isEstimated: false
  }
  return result
}