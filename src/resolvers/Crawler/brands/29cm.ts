import { getHtmlRequest, parseHtml } from "../util"
import { CrawledItemInfo } from "../type/ReturnType"
import { strip, formatUrl } from "../../Utils/stringUtil"
const puppeteer = require("puppeteer")

export async function crawl29cm(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode
  try {
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--user-agent=Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)"]
    })
    const page = await browser.newPage()
    await page.goto(sourceUrl)
    await page.waitForSelector(".prd_info")
    //await page.waitForFunction('window.status==="ready"')
    //await page.waitFor(5000)
    htmlCode = await page.content()
  } catch (e) {
    console.log(e)
    console.log("PUPPETEER FAILED")
  }

  //let htmlCode = await getHtmlRequest(sourceUrl)
  console.log(htmlCode)
  //Mistyped class name
  let brand = parseHtml(htmlCode, "string", "value", ".brnad_link", "_ngcontent-c36")
  let price = parseHtml(htmlCode, "number", "value", ".o", ".num")
  let saleprice = parseHtml(htmlCode, "number", "value", ".s", ".num")
  if (saleprice == 0) price = parseHtml(htmlCode, "number", "value", ".p", ".num")

  let itemname = parseHtml(htmlCode, "string", "value", ".prd_info", ".name")
  let image = parseHtml(htmlCode, "string", "attribute", ".imgbx .imgbx2", "img", "src")

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
