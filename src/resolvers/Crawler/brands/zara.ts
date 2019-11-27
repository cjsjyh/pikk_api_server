import { getHtmlRequest, parseHtml } from "../util"
import { CrawledItemInfo } from "../type/ReturnType"
import { strip, formatUrl } from "../../Utils/stringUtil"
// const puppeteer = require("puppeteer")

export async function crawlZara(sourceUrl): Promise<CrawledItemInfo> {
  // const browser = await puppeteer.launch({
  //   headless: true,
  //   args: ["--no-sandbox", "--disable-setuid-sandbox"]
  // })
  // const page = await browser.newPage()
  // await page.goto(sourceUrl)
  // let htmlCode = page.content()
  let htmlCode = await getHtmlRequest(sourceUrl)

  let itemname = parseHtml(htmlCode, "string", "value", ".info-section", ".product-name")
  let image = parseHtml(htmlCode, "string", "attribute", ".main-image", "img", "src")

  let price = parseHtml(htmlCode, "number", "value", ".price", ".line-through")
  let saleprice = parseHtml(htmlCode, "number", "value", ".price", ".sale")

  if (price == null || price == 0) {
    price = parseHtml(htmlCode, "number", "value", ".price", ".main-price")
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
    brandKor: "자라",
    originalPrice: price,
    salePrice: saleprice,
    name: strip(itemname),
    imageUrl: [formatUrl(image)],
    purchaseUrl: sourceUrl,
    isEstimated: false
  }
  return result
}
