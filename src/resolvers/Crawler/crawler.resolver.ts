import { CrawledItemInfo } from "./type/ReturnType"
import { validateCrawledItem, extractDomain } from "./util"
import { strip, logWithDate } from "../Utils/stringUtil"

import { crawlCoor } from "./coor"
import { crawlGiordano, crawlGiordanoMobile } from "./giordano"
import { crawlDunst } from "./dunst"
import { crawlDrawFit } from "./drawfit"
import { crawlTheKnitCompany } from "./theknitcompany"

module.exports = {
  Query: {
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

        console.log(result)
        if (validateCrawledItem(result)) return result
        else {
          logWithDate("[Error] Item crawling failed. Retry with valid URL: " + args.url)
          throw new Error("[Error] Item crawling failed. Retry with valid URL")
        }
      } catch (e) {
        logWithDate("[Error] Item crawling failed. Retry with valid URL: " + args.url)
        throw new Error("[Error] Item crawling failed. Retry with valid URL")
      }
    }
  }
}
