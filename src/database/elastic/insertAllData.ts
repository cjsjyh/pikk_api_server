import { RunSingleSQL } from "../../resolvers/Utils/promiseUtil"
let elastic = require("./database/elastic/elasticConnect")

async function main() {
  let queryResult = await RunSingleSQL(`SELECT rec.id, rec.content FROM "RECOMMEND_POST" rec`)
  queryResult.forEach(async postId => {
    await RunSingleSQL(`SELECT `)
  })
}
main()
