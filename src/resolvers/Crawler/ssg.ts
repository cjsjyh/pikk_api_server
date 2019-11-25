import { getHtmlRequest, parseHtml } from "./util"
import { CrawledItemInfo } from "./type/ReturnType"
import { strip, formatUrl } from "../Utils/stringUtil"

export async function crawlSSG(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode = await getHtmlRequest(sourceUrl)

  let itemname = parseHtml(htmlCode, "string", "value", ".cdtl_info_tit")
  let image = parseHtml(htmlCode, "string", "attribute", ".cdtl_imgbox.imgzoom", "img", "src")

  let price = parseHtml(htmlCode, "number", "value", ".cdtl_old_price", ".ssg_price")
  let saleprice = parseHtml(htmlCode, "number", "value", ".cdtl_new_price.notranslate", ".ssg_price")

  if (price == null || price == 0) {
    price = saleprice
    saleprice = null
  }

  // let result22: CrawledItemInfo = {
  //   brandKor: null,
  //   originalPrice: price,
  //   salePrice: saleprice,
  //   name: itemname,
  //   imageUrl: [image],
  //   purchaseUrl: sourceUrl,
  //   isEstimated: false
  // }
  // console.log(result22)

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
