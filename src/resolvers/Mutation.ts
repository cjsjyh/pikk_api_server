//https://www.apollographql.com/docs/graphql-tools/resolvers/

import { QueryResult, PoolClient } from "pg"
//import { UserCredential } from "./Type"

const { pool } = require("../database/connectionPool")

export type UserCredential = {
    username: string
    password: string
}


module.exports = {
    helloWorld(parent: void, args: void): string {
      return `👋 Hello world! 👋`
    },
    
    // RegisterUser(parent: Object, args: UserCredential): Boolean {
    //     let errFlag = false;
    //     pool.connect().then((client: PoolClient)=> {
    //         client
    //         .query('INSERT INTO "USER_CONFIDENTIAL"("username","password") VALUES ($1,$2)',[args.username, args.password])
    //         .then((res: QueryResult) => {
    //             client.release()
    //             console.log("Query Success!")
    //             console.log(res)
    //             errFlag = true;
    //         })
    //         .catch((err:Error) => {
    //             client.release()
    //             console.log("[Error] Failed to Query to DB")
    //             console.log(err.stack)
    //             errFlag = false;
    //         })
    //     })
    //     .catch((err:Error) => {
    //         console.log("[Error] Failed to Connect to DB")
    //         console.log(err.stack)
    //         errFlag = false;
    //     })
    //     console.log("Returning: " + errFlag)
    //     return errFlag;
    // },
    
    RegisterUser: async (parent: Object, args: UserCredential): Promise<Boolean> => {
        try {
            const client = await pool.connect();
            const rows = await client.query('INSERT INTO "USER_CONFIDENTIAL"("username","password") VALUES ($1,$2)',[args.username, args.password]);
            client.release()
            console.log(rows)
            return true;
        } catch(e){
            console.log("[Error] Failed Pushing to DB")
            return false;
        }
    }
  }