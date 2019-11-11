import { getHtml, parseHtml } from "./util"
import { CrawledItemInfo } from "./type/ReturnType"
import { strip } from "../Utils/stringUtil"

export async function crawlTheKnitCompany(sourceUrl): Promise<CrawledItemInfo> {
  console.log("the knit")
  let htmlCode = await getHtml(sourceUrl)
  let price = parseHtml(htmlCode, "number", "value", "#span_product_price_custom")
  console.log(price)
  let saleprice = parseHtml(htmlCode, "number", "value", "#span_product_price_text")
  console.log(saleprice)
  let itemname = parseHtml(htmlCode, "string", "value", "title")
  console.log(itemname)
  let image = parseHtml(htmlCode, "string", "attribute", ".xans-product-image", "img", "src")
  console.log(image)

  if (price == null) {
    price = saleprice
    saleprice = null
  }
  itemname = itemname.split("-")[0]

  let result: CrawledItemInfo = {
    brandKor: "더니트컴퍼니",
    originalPrice: price,
    salePrice: saleprice,
    name: strip(itemname),
    imageUrl: image,
    purchaseUrl: sourceUrl
  }
  return result
}
