import { logWithDate } from "../Utils/stringUtil"
import { CrawledItemInfo } from "./type/ReturnType"

const cheerio = require("cheerio")
const request = require("request")
const iconv = require("iconv-lite") //인코딩을 변환 해주는 모듈, 필자는 iconv보다 iconv-lite를 선호한다.
const charset = require("charset") //해당 사이트의 charset값을 알 수 있게 해준다.

export async function getHtml(sourceUrl: string) {
  try {
    return new Promise((resolve, reject) => {
      request(
        {
          url: sourceUrl, // 원하는 url값을 입력
          encoding: null //해당 값을 null로 해주어야 제대로 iconv가 제대로 decode 해준다.
        },
        function(error, res, body) {
          console.log(body)
          if (!error && res.statusCode == 200) {
            const enc = charset(res.headers, body) // 해당 사이트의 charset값을 획득
            const i_result = iconv.decode(body, enc) // 획득한 charset값으로 body를 디코딩
            resolve(i_result)
          }
        }
      )
    })
  } catch (e) {
    logWithDate(e)
  }
}

export function parseHtml(
  htmlCode: any,
  returnType: "string" | "number",
  dataLocation: "attribute" | "value",
  parentSelector: string,
  childSelector: string = "",
  attributeName?: string,
  index: number = 0
) {
  const $ = cheerio.load(htmlCode, { decodeEntities: false })

  let value
  if (dataLocation == "attribute") {
    if (childSelector != "") {
      value = $(parentSelector)
        .find($(childSelector))
        .eq(index)
        .attr(attributeName)
    } else {
      value = $(parentSelector)
        .eq(index)
        .attr(attributeName)
    }
  } else {
    if (childSelector != "")
      value = $(parentSelector)
        .find($(childSelector))
        .eq(index)
        .contents()
        .first()
        .text()
    else
      value = $(parentSelector)
        .eq(index)
        .contents()
        .first()
        .text()
  }

  if (value == undefined || value == null || value == "") return null

  if (returnType == "number") return convertStringToNumber(value)

  return value
}

function convertSelectorListToString(selectors: string[]): string {
  let result = ""
  selectors.forEach((selector, index) => {
    if (index != 0) result += ", "
    result += selector
  })
  return result
}

function convertStringToNumber(str: string): number {
  let removed = str.replace(/[^\d.-]/g, "")
  return Number(removed)
}

export function validateCrawledItem(result: CrawledItemInfo): boolean {
  if (result.brandKor == null) return false
  if (result.imageUrl == null) return false
  if (result.name == null) return false
  if (result.originalPrice == null) return false
  if (result.purchaseUrl == null) return false
  return true
}

export function extractDomain(url: string): string {
  url = url.replace("https://", "")
  url = url.replace("http://", "")
  url = url.replace("www.", "")
  url = url.split("/")[0]
  return url
}
