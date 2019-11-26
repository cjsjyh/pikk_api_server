import { CrawledItemInfo } from "./type/ReturnType"
import { extractDomain } from "./util"
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

var logger = require("../../tools/logger")

module.exports = {
  Mutation: {
    crawlItem: async (parent: void, args: any): Promise<CrawledItemInfo> => {
      args.url = strip(args.url)
      let domain = extractDomain(args.url)
      try {
        let result: CrawledItemInfo
        if (domain == "coor.kr") result = await crawlCoor(args.url)
        else if (domain == "m.giordano.co.kr") result = await crawlGiordanoMobile(args.url)
        else if (domain == "giordano.co.kr") result = await crawlGiordano(args.url)
        else if (domain == "dunststudio.com") result = await crawlDunst(args.url)
        else if (domain == "draw-fit.com") result = await crawlDrawFit(args.url)
        else if (domain == "theknitcompany.com") result = await crawlTheKnitCompany(args.url)
        else if (domain == "store.musinsa.com") result = await crawlMusinsa(args.url)
        else if (domain == "llud.co.kr") result = await crawlLlude(args.url)
        else if (domain == "lfmall.co.kr") result = await crawlLfmall(args.url)
        else if (domain == "mustit.co.kr") result = await crawlMustIt(args.url)
        else if (domain == "ebay.com") result = await crawlEbay(args.url)
        else if (domain == "matchesfashion.com") result = await crawlMatchesFashion(args.url)
        else if (domain == "wconcept.co.kr") result = await crawlWConcept(args.url)
        else if (domain == "ocokorea.com") result = await crawlOco(args.url)
        else {
          result = await crawlOthers(args.url)
          logger.debug(result.purchaseUrl)
        }

        logger.info("Item Crawled!")
        return result
      } catch (e) {
        logger.warn("Item crawling failed. Retry with valid URL: " + args.url)
        logger.error(e.stack)
        throw new Error("[Error] Item crawling failed. Retry with valid URL")
      }
    }
  }
}
