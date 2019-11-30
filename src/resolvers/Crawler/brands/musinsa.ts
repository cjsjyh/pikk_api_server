import { getHtmlAxios, parseHtml } from "../util"
import { CrawledItemInfo } from "../type/ReturnType"
import { strip, formatUrl } from "../../Utils/stringUtil"

export async function crawlMusinsa(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlAxios(sourceUrl)
  let price = parseHtml(htmlCode.data, "number", "value", "#goods_price")
  if (price == 0) price = parseHtml(htmlCode.data, "number", "value", "#goods_price", "del")
  let saleprice = parseHtml(htmlCode.data, "number", "value", "#sale_price")
  let itemname = parseHtml(htmlCode.data, "string", "value", ".product_title", "span")
  let image = parseHtml(htmlCode.data, "string", "attribute", ".product-img", "img", "src")
  let brand = parseHtml(htmlCode.data, "string", "value", ".item_categories", "a", "", 2)
  brand = brand.replace("(", "")
  brand = brand.replace(")", "")

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
