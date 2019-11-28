import { getHtmlRequest, parseHtml, getHtmlAxios } from "../util"
import { CrawledItemInfo } from "../type/ReturnType"
import { strip, formatUrl } from "../../Utils/stringUtil"
const puppeteer = require("puppeteer")

export async function crawlAdidas(sourceUrl): Promise<CrawledItemInfo> {
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] })
  const page = await browser.newPage()
  await page.goto(sourceUrl)
  //await page.waitForFunction('window.status==="ready"')
  await page.waitFor(2000)
  let htmlCode = page.content()
  //let htmlCode = await getHtmlRequest(sourceUrl)

  let itemname = parseHtml(htmlCode, "string", "value", "#p_prod_bas")
  let image = parseHtml(htmlCode, "string", "attribute", "#BASIC_IMG", "", "src")

  let price = parseHtml(htmlCode, "number", "value", "#sn_price")
  let saleprice = parseHtml(htmlCode, "number", "value", "#ss_price")

  if (price == null || price == 0) {
    price = parseHtml(htmlCode, "number", "value", "#n_price")
  }

  let result22: CrawledItemInfo = {
    brandKor: "아디다스",
    originalPrice: price,
    salePrice: saleprice,
    name: itemname,
    imageUrl: [image],
    purchaseUrl: sourceUrl,
    isEstimated: false
  }
  console.log(result22)

  let result: CrawledItemInfo = {
    brandKor: "아디다스",
    originalPrice: price,
    salePrice: saleprice,
    name: strip(itemname),
    imageUrl: [formatUrl(image)],
    purchaseUrl: sourceUrl,
    isEstimated: false
  }
  await browser.close()
  return result
}
