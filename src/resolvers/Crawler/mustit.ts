import { getHtmlRequest, parseHtml } from "./util"
import { CrawledItemInfo } from "./type/ReturnType"
import { strip, formatUrl } from "../Utils/stringUtil"

export async function crawlMustIt(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)

  let brand = parseHtml(
    htmlCode,
    "string",
    "value",
    "#productDetailInfo",
    ".h0.mi-group-b5.mi-bold.mi-block.mi-ellipsis"
  )
  let price = parseHtml(
    htmlCode,
    "number",
    "value",
    "#productDetailInfo",
    ".h3.mi-bold.mi-roboto.mi-font-darkblack"
  )
  let saleprice = parseHtml(
    htmlCode,
    "number",
    "value",
    "#productDetailInfo",
    ".mi-2xlarge.mi-bold.mi-roboto.mi-font-primary.mi-valign-bottom"
  )
  if (price == null && saleprice != 0) {
    price = saleprice
    saleprice = null
  }

  let itemname = parseHtml(
    htmlCode,
    "string",
    "value",
    "#productDetailInfo",
    ".h4.mi-text-interval-basic"
  )
  let image = parseHtml(htmlCode, "string", "attribute", ".product_image_wrapper", "img", "src", 1)

  let tempResult: CrawledItemInfo = {
    brandKor: brand,
    originalPrice: price,
    salePrice: saleprice,
    name: itemname,
    imageUrl: image,
    purchaseUrl: sourceUrl
  }
  console.log(tempResult)

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
