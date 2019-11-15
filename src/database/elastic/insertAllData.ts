import { RunSingleSQL } from "../../resolvers/Utils/promiseUtil"
let elastic = require("./database/elastic/elasticConnect")

async function main() {
  //get Date from DB
  let postResult = await RunSingleSQL(`SELECT rec.id, rec.content FROM "RECOMMEND_POST" rec LIMIT 1`)
  postResult.forEach(async postId => {
    let reviewResult = await RunSingleSQL(`SELECT review.id, FROM "ITEM_REVIEW" review WHERE "FK_postId=${postId.id}`)
  })
}
main()
