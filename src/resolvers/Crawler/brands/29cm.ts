import { getHtmlRequest, parseHtml } from "../util"
import { CrawledItemInfo } from "../type/ReturnType"
import { strip, formatUrl } from "../../Utils/stringUtil"

//var chrome = require("chromedriver")

export async function crawl29cm(sourceUrl): Promise<CrawledItemInfo> {
  let htmlCode
  try {
    var webdriver = require("selenium-webdriver")

    //#Option 1
    // var chromeCapabilities = webdriver.Capabilities.chrome()
    // //setting chrome options to start the browser fully maximized
    // var chromeOptions = {
    //   args: ["--headless", "--disable-gpu", "--no-sandbox", "--disable-extensions", "--disable-dev-shm-usage"]
    // }
    // chromeCapabilities.set("chromeOptions", chromeOptions)
    // var driver = new webdriver.Builder().withCapabilities(chromeCapabilities).build()

    //#Option 2
    // var options = new chrome.Options()
    // options.addArguments(["--headless", "lang=ko_KR", "--no-sandbox", "--disable-dev-shm-usage"])
    // var driver = new webdriver.Builder().withCapabilities(options.toCapabilities()).build()

    //var chrome = require("selenium-webdriver/chrome")
    // process.env["PATH"] += "/mnt/c/users/junsoo/desktop/chromedriver"
    // var options = new chrome.Options()
    // var driver = new webdriver.Builder().withCapabilities(options.toCapabilities()).build()

    // var chrome = require("selenium-webdriver/chrome")
    // var driver = new chrome.Driver()
    var driver = new webdriver.Builder().forBrowser("chrome").build()

    //var driver = new webdriver.Builder().forBrowser("chrome").build()
    await driver.get(sourceUrl)
    htmlCode = driver.getPageSource()
  } catch (e) {
    console.log(e)
    return null
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
