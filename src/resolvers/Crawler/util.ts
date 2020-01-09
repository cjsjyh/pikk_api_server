import { RunSingleSQL } from "../Utils/promiseUtil"
import { formatUrls, strip } from "../Utils/stringUtil"
import { CrawledItemInfo } from "./type/ReturnType"

const cheerio = require("cheerio")
const request = require("request")
const axios = require("axios")
const iconv = require("iconv-lite") //인코딩을 변환 해주는 모듈, 필자는 iconv보다 iconv-lite를 선호한다.
const charset = require("charset") //해당 사이트의 charset값을 알 수 있게 해준다.

var logger = require("../../tools/logger")

export async function fetchConvertDjangoResult(
  websiteName: string,
  sourceUrl: string,
  brandName?: string
): Promise<any> {
  let resultAxios = await axios.get(
    `http://${process.env.DJANGO_HOST}:8000/crawler/${websiteName}/${sourceUrl}`
  )
  resultAxios = resultAxios.data
  let result: CrawledItemInfo = {
    brandKor: resultAxios.brand || brandName,
    originalPrice: resultAxios.price,
    salePrice: resultAxios.salePrice,
    name: strip(resultAxios.itemname),
    imageUrl: formatUrls(resultAxios.images),
    purchaseUrl: sourceUrl,
    isEstimated: false
  }
  return result
}

//crawl using request
export async function getHtmlRequest(sourceUrl: string) {
  try {
    return new Promise((resolve, reject) => {
      request(
        {
          url: sourceUrl, // 원하는 url값을 입력
          encoding: null, //해당 값을 null로 해주어야 제대로 iconv가 제대로 decode 해준다.
          headers: { "User-Agent": "Mozilla/5.0" }
        },
        function(error, res, body) {
          if (!error && res.statusCode == 200) {
            const enc = charset(res.headers, body) // 해당 사이트의 charset값을 획득
            const i_result = iconv.decode(body, enc) // 획득한 charset값으로 body를 디코딩
            resolve(i_result)
          } else {
            reject(error)
          }
        }
      )
    })
  } catch (e) {
    logger.error(e.stack)
  }
}

//crawl using axios
export async function getHtmlAxios(sourceUrl: string) {
  try {
    return axios.get(sourceUrl, {
      headers: { "User-Agent": "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)" }
    })
  } catch (e) {
    logger.error(e.response)
  }
}

//traverse html
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
        .first()
        .text()
    else
      value = $(parentSelector)
        .eq(index)
        .first()
        .text()
  }

  if (value == undefined || value == null || value == "") return null

  if (returnType == "number") return convertStringToNumber(value)

  return value
}

//check if requested url has been already crawled
export async function checkDuplicateCrawlingUrl(url: string): Promise<any> {
  let querySql = `
    SELECT * FROM "ITEM_VARIATION" item_var
    INNER JOIN "ITEM_GROUP" item_gr ON item_var."FK_itemGroupId" = item_gr.id
    INNER JOIN "BRAND" brand ON item_gr."FK_brandId" = brand.id
    WHERE item_var."purchaseUrl" = '${url}'
  `
  let result = await RunSingleSQL(querySql)
  if (result.length == 0) return null
  else {
    return {
      brandKor: result[0].nameKor,
      name: result[0].name,
      originalPrice: result[0].originalPrice,
      salePrice: null,
      purchaseUrl: url,
      imageUrl: [result[0].imageUrl],
      isEstimated: false,

      itemMajorType: result[0].itemMajorType,
      itemMinorType: result[0].itemMinorType,
      itemFinalType: result[0].itemFinalType
    }
  }
}

function convertStringToNumber(str: string): number {
  let removed = str.replace(/[^\d.-]/g, "")
  return Number(removed)
}

export function extractDomain(url: string): string[] {
  url = url.replace("https://", "")
  url = url.replace("http://", "")
  url = url.replace("www.", "")
  url = url.replace("www2.", "")
  let urls = url.split("/")
  return urls
}

export function extractPorotocol(url: string): string {
  let protocol = url.split("//")[0]
  return protocol + "//"
}
