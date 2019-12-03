import { getHtmlRequest, parseHtml, getHtmlAxios } from "../util"
import { CrawledItemInfo } from "../type/ReturnType"
import { strip, hasNumber, hasCurrency, extractNumber, formatUrl } from "../../Utils/stringUtil"

var axios = require("axios")
const cheerio = require("cheerio")

export async function crawlOthers(sourceUrl): Promise<CrawledItemInfo> {
  try {
    let resultAxios = await axios.get("http://" + process.env.DJANGO_HOST + ":8000/crawler/" + sourceUrl)
    resultAxios = resultAxios.data
    let result: CrawledItemInfo = {
      brandKor: resultAxios.brand,
      originalPrice: resultAxios.price,
      salePrice: null,
      name: strip(resultAxios.itemname),
      imageUrl: resultAxios.images,
      purchaseUrl: sourceUrl,
      isEstimated: false
    }
    return result
  } catch (e) {
    let htmlCode
    try {
      htmlCode = await getHtmlRequest(sourceUrl)
    } catch (e) {
      try {
        htmlCode = await getHtmlAxios(sourceUrl)
        htmlCode = htmlCode.data
      } catch (e) {
        throw new Error("Failed to crawl")
      }
    }
    const $ = cheerio.load(htmlCode, { decodeEntities: false })
    let images = []
    $("img").map((index, element) => {
      let tempUrl = $(element).attr("src")
      if (tempUrl != "null" && tempUrl != null && tempUrl != "") images.push(formatUrl(tempUrl))
    })

    let itemname = $("title").text()

    let brand = $("a")
      .eq(0)
      .text()
    let priceHighPossibility = []
    let price = []
    $("span").map((index, element) => {
      let extractedText = $(element).text()
      if (extractedText.length < 4) return
      if (!hasNumber(extractedText)) return
      if (hasCurrency(extractedText)) {
        priceHighPossibility.push(extractNumber(extractedText))
        return
      }
      price.push(extractNumber(extractedText))
    })
    $("p").map((index, element) => {
      let extractedText = $(element).text()
      if (extractedText.length < 4) return
      if (!hasNumber(extractedText)) return
      if (hasCurrency(extractedText)) {
        priceHighPossibility.push(extractNumber(extractedText))
        return
      }
      price.push(extractNumber(extractedText))
    })

    let priceGuess
    if (priceHighPossibility.length == 0) priceGuess = price[price.length / 2]
    else priceGuess = priceHighPossibility[0]

    let result: CrawledItemInfo = {
      brandKor: brand,
      originalPrice: priceGuess,
      salePrice: null,
      name: strip(itemname),
      imageUrl: images,
      purchaseUrl: sourceUrl,
      isEstimated: false
    }
    return result
  }
}

function findDistance(htmlCode: any, obj: any): number {
  const $ = cheerio.load(htmlCode, { decodeEntities: false })
  let level = 1
  while (true) {
    if ($(obj)["0"].parent.name == "body") break
    obj = $(obj)["0"].parent
    level += 1
  }
  return level
}
