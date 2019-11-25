import { getHtmlRequest, parseHtml } from "./util"
import { CrawledItemInfo } from "./type/ReturnType"
import { strip, formatUrl } from "../Utils/stringUtil"

export async function crawlGiordano(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)

  let price = parseHtml(htmlCode, "number", "value", ".price", "del")
  let saleprice = parseHtml(htmlCode, "number", "value", ".price", ".sell")
  let itemname = parseHtml(htmlCode, "string", "value", ".info", ".name")
  let image = parseHtml(htmlCode, "string", "attribute", ".slick-slide", "img", "src")

  if (price == null && saleprice != 0) {
    price = saleprice
    saleprice = null
  }

  let result: CrawledItemInfo = {
    brandKor: "지오다노",
    originalPrice: price,
    salePrice: saleprice,
    name: strip(itemname),
    imageUrl: [formatUrl(image)],
    purchaseUrl: sourceUrl
  }
  return result
}

export async function crawlGiordanoMobile(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)

  let price = parseHtml(htmlCode, "number", "value", ".price", "del")
  let saleprice = parseHtml(htmlCode, "number", "value", ".price", ".sell")
  let itemname = parseHtml(htmlCode, "string", "value", ".prd_name")
  let image = parseHtml(htmlCode, "string", "attribute", ".swiper-slide", "img", "src")
  image = image.replace("#addimg", "")

  if (price == null && saleprice != 0) {
    price = saleprice
    saleprice = null
  }

  let result: CrawledItemInfo = {
    brandKor: "지오다노",
    originalPrice: price,
    salePrice: saleprice,
    name: strip(itemname),
    imageUrl: [formatUrl(image)],
    purchaseUrl: sourceUrl
  }
  return result
}
