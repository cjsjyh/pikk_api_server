import { getHtml, parseHtml } from "./util"
import { CrawledItemInfo } from "./type/ReturnType"
import { strip } from "../Utils/stringUtil"

export async function crawlMusinsa(sourceUrl): Promise<CrawledItemInfo> {
  console.log(sourceUrl)
  let htmlCode = await getHtml(sourceUrl)
  console.log(htmlCode)
  console.log(sourceUrl)
  let price = parseHtml(htmlCode, "number", "value", "#goods_price", "del")
  console.log(price)
  let saleprice = parseHtml(htmlCode, "number", "value", "#sale_price", "del")
  console.log(saleprice)
  let itemname = parseHtml(htmlCode, "string", "value", ".product_title", "span")
  console.log(itemname)
  let image = parseHtml(htmlCode, "string", "attribute", ".product-img", "img", "src")
  console.log(image)

  let result: CrawledItemInfo = {
    brandKor: "무신사",
    originalPrice: price,
    salePrice: saleprice,
    name: strip(itemname),
    imageUrl: image,
    purchaseUrl: sourceUrl
  }
  return result
}
