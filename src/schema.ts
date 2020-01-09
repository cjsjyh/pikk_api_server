import "graphql-import-node"
import { makeExecutableSchema } from "graphql-tools"
import { GraphQLSchema } from "graphql"

import path from "path"
import { fileLoader, mergeTypes, mergeResolvers } from "merge-graphql-schemas"

const graphqlArray = fileLoader(path.join(__dirname, "/**/*.graphql"))
const resolverArray = fileLoader(path.join(__dirname, "./**/*.resolver.*"))

const schema: GraphQLSchema = makeExecutableSchema({
  typeDefs: mergeTypes(graphqlArray),
  resolvers: mergeResolvers(resolverArray)
})

export default schema
