import { crawlCoor } from "./coor"
import { CrawledItemInfo } from "./type/ReturnType"
import { validateCrawledItem, extractDomain } from "./util"
import { logWithDate } from "../Utils/stringUtil"

module.exports = {
  Query: {
    crawlItem: async (parent: void, args: any): Promise<CrawledItemInfo> => {
      let domain = extractDomain(args.url)

      let result: CrawledItemInfo
      if (domain == "coor.kr") result = await crawlCoor(args.url)
      else if (domain == "m.giordano.co.kr") console.log("Crawling mobile giordano")

      console.log(result)
      if (validateCrawledItem(result)) return result
      else {
        logWithDate("[Error] Item crawling failed. Retry with valid URL: " + args.url)
        throw new Error("[Error] Item crawling failed. Retry with valid URL")
      }
    }
  }
}
