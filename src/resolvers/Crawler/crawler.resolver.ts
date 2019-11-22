import { CrawledItemInfo } from "./type/ReturnType"
import { validateCrawledItem, extractDomain } from "./util"
import { strip } from "../Utils/stringUtil"

import { crawlCoor } from "./coor"
import { crawlGiordano, crawlGiordanoMobile } from "./giordano"
import { crawlDunst } from "./dunst"
import { crawlDrawFit } from "./drawfit"
import { crawlTheKnitCompany } from "./theknitcompany"
import { crawlMusinsa } from "./musinsa"
import { crawlOthers } from "./crawlOthers"
import { crawlLlude } from "./llude"

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
        else {
          result = await crawlOthers(args.url)
          logger.debug(result.purchaseUrl)
        }

        if (validateCrawledItem(result)) {
          logger.info("Item Crawled!")
          return result
        } else {
          logger.warn("Item crawling missing some fields: " + args.url)
          throw new Error("[Error] Item crawling missing some fields")
        }
      } catch (e) {
        logger.warn("Item crawling failed. Retry with valid URL: " + args.url)
        logger.error(e.stack)
        throw new Error("[Error] Item crawling failed. Retry with valid URL")
      }
    }
  }
}
