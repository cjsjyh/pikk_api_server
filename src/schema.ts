import "graphql-import-node"
import { makeExecutableSchema } from "graphql-tools"
import { GraphQLSchema } from "graphql"

import path from "path"
import { fileLoader, mergeTypes, mergeResolvers } from "merge-graphql-schemas"
import * as fs from "fs"
import * as glob from "glob"

//const resolvers = require("./resolvers/index")

//const graphqlArray = fileLoader(path.join(__dirname, "."), { recursive: true })
const graphqlArray = fileLoader(path.join(__dirname, "/**/*.graphql"))
//const graphqlArray = glob.sync(`${__dirname}/**/*.graphql`).map(x => fs.readFileSync(x, { encoding: "utf8" }))

const resolverArray = fileLoader(path.join(__dirname, "./**/*.resolver.*"))

const schema: GraphQLSchema = makeExecutableSchema({
  typeDefs: mergeTypes(graphqlArray),
  resolvers: mergeResolvers(resolverArray)
})

export default schema
