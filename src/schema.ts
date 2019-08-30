import "graphql-import-node"
import { makeExecutableSchema } from "graphql-tools"
import { GraphQLSchema } from "graphql"
//import * as typeDefs from "./schema.graphql"
import typeDefs from "./graphql/typeDefs"
const resolvers = require("./resolvers/index")

const schema: GraphQLSchema = makeExecutableSchema({
  typeDefs,
  resolvers
})

export default schema
