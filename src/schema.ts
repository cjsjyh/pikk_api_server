import "graphql-import-node"
import { makeExecutableSchema } from "graphql-tools"
import { GraphQLSchema } from "graphql"
import * as typeDefs from "./schema.graphql"
const resolvers = require("./resolvers/index")

const schema: GraphQLSchema = makeExecutableSchema({
  typeDefs,
  resolvers
})

export default schema
