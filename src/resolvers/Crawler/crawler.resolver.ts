import { CrawledItemInfo } from "./type/ReturnType"
import { extractDomain, fetchConvertDjangoResult, checkDuplicateCrawlingUrl } from "./util"
import { strip } from "../Utils/stringUtil"

import { crawlCoor } from "./brands/coor"
import { crawlGiordano, crawlGiordanoMobile } from "./brands/giordano"
import { crawlDunst } from "./brands/dunst"
import { crawlDrawFit } from "./brands/drawfit"
import { crawlTheKnitCompany } from "./brands/theknitcompany"
import { crawlMusinsa } from "./brands/musinsa"
import { crawlOthers } from "./brands/crawlOthers"
import { crawlLlude } from "./brands/llude"
import { crawlLfmall } from "./brands/lfmall"
import { crawlEbay } from "./brands/ebay"
import { crawlMustIt } from "./brands/mustit"
import { crawlMatchesFashion } from "./brands/machesfashion"
import { crawlWConcept } from "./brands/wconcept"
import { crawlOco } from "./brands/oco"
import { crawlSSG } from "./brands/ssg"

var logger = require("../../tools/logger")

module.exports = {
  Mutation: {
    crawlItem: async (parent: void, args: any): Promise<CrawledItemInfo> => {
      args.url = strip(args.url)
      args.url = encodeURI(args.url)

      let checkResult = await checkDuplicateCrawlingUrl(args.url)
      if (checkResult) return checkResult

      let splitDomain = extractDomain(args.url)
      let domain = splitDomain[0]
      let subdomain = splitDomain[1]

      let result: CrawledItemInfo
      try {
        if (domain == "coor.kr") result = await crawlCoor(args.url)
        else if (domain == "m.giordano.co.kr") result = await crawlGiordanoMobile(args.url)
        else if (domain == "giordano.co.kr") result = await crawlGiordano(args.url)
        else if (domain == "dunststudio.com") result = await crawlDunst(args.url)
        else if (domain == "draw-fit.com") result = await crawlDrawFit(args.url)
        else if (domain == "theknitcompany.com") result = await crawlTheKnitCompany(args.url)
        else if (domain == "store.musinsa.com") result = await crawlMusinsa(args.url)
        else if (domain == "llud.co.kr") result = await crawlLlude(args.url)
        else if (domain == "lfmall.co.kr") result = await crawlLfmall(args.url)
        else if (domain == "wconcept.co.kr") result = await crawlWConcept(args.url)
        else if (domain == "mustit.co.kr") result = await crawlMustIt(args.url)
        else if (domain == "ebay.com") result = await crawlEbay(args.url)
        else if (domain == "matchesfashion.com") result = await crawlMatchesFashion(args.url)
        else if (domain == "ssg.com") result = await crawlSSG(args.url)
        else if (domain == "ocokorea.com") result = await crawlOco(args.url)
        else if (domain == "29cm.co.kr") result = await fetchConvertDjangoResult("29cm", args.url)
        else if (domain == "zara.com")
          result = await fetchConvertDjangoResult("zara", args.url, "자라")
        else if (domain == "hm.com")
          result = await fetchConvertDjangoResult("handm", args.url, "H&M")
        else if (domain == "nike.com")
          result = await fetchConvertDjangoResult("nike", args.url, "나이키")
        else if (domain == "front.wemakeprice.com")
          result = await fetchConvertDjangoResult("wemakeprice", args.url, "")
        else if (domain == "cosstores.com")
          result = await fetchConvertDjangoResult("cos", args.url, "코스")
        else if (domain == "smartstore.naver.com")
          result = await fetchConvertDjangoResult("naverstore", args.url, "")
        else if (domain == "shopping.naver.com")
          result = await fetchConvertDjangoResult("navershopping", args.url, "")
        else if (domain == "ssfshop.com" && subdomain == "8seconds")
          result = await fetchConvertDjangoResult("8seconds", args.url, "에잇세컨즈")
        else {
          result = await crawlOthers(args.url)
          logger.debug(result.purchaseUrl)
        }

        logger.info("Item Crawled! " + domain)
        return result
      } catch (err) {
        try {
          logger.error(err.stack)
          logger.warn("Item crawling failed. Retrying with crawlOthers....")
          result = await crawlOthers(args.url)
          logger.info("Item Crawled after retry!" + domain)
          return result
        } catch (e) {
          logger.warn("Item crawling failed. Retry with valid URL: " + args.url)
          logger.error(e.stack)
          throw new Error("[Error] Item crawling failed. Retry with valid URL")
        }
      }
    }
  }
}
