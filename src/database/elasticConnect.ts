const { Client } = require("@elastic/elasticsearch")

const parameters = {
  node: "http://" + process.env.ELASTIC_HOST + ":9200",
  maxRetries: 5,
  requestTimeout: 60000,
  auth: {
    username: "elastic",
    password: process.env.ELASTIC_PASSWORD
  }
}

const elasticClient = new Client(parameters)

function GetNewElasticClient() {
  let client = new Client(parameters)
  return client
}

async function SearchElasticSearch(
  client: any,
  indexName: string,
  searchText: string,
  start: number,
  first: number,
  searchType: string,
  searchFields: string[]
) {
  let param = {
    index: indexName,
    body: {
      _source: [""],
      from: start,
      size: first,
      query: {
        multi_match: {
          query: searchText,
          type: searchType,
          fields: searchFields
        }
      },
      sort: [{ _score: { order: "desc" } }, { "@timestamp": { order: "desc" } }]
    }
  }

  let result = await client.search(param)
  return result.body.hits
}

async function InsertElasticSearch(client: any, indexName: string, properties: string[], values: string[]) {
  let param = {
    index: indexName,
    type: "_doc",
    body: {}
  }
  if (properties.length != values.length) throw new Error("[Error] Property and Value count don't match")
  properties.forEach((property, index) => {
    param.body[property] = values[index]
  })

  let result = await client.index(param)
  return result.body
}

module.exports = {
  elasticClient,
  GetNewElasticClient,
  SearchElasticSearch,
  InsertElasticSearch
}
