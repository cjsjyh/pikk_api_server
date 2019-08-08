// import { IResolvers } from "graphql-tools"
// const Query: IResolvers = {
//   Query: {
//     helloWorld(_: void, args: void): string {
//       return `👋 Hello world! 👋`
//     }
//   }
// }



// export default Query

module.exports = {
  helloWorld(_: void, args: void): string {
    return `👋 Hello world! 👋`
  }
}
