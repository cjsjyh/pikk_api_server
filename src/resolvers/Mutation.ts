//https://www.apollographql.com/docs/graphql-tools/resolvers/

import { UserInfo } from "./Type"
import { addCatchUndefinedToSchema } from "graphql-tools";
const { pool } = require("../database/connectionPool")


module.exports = {
    helloWorld(parent: void, args: void): string {
      return `👋 Hello world! 👋`
    },
    
    RegisterUser: async (parent: Object, args: UserInfo): Promise<Boolean> => {
        //Make Connection
        let client;
        try {
            client = await pool.connect();
        } catch(e){
            console.log("[Error] Failed Connecting to DB")
            return false
        }

        //Make UserCredential
        let id;
        try {
            let qResult = await client.query('INSERT INTO "USER_CONFIDENTIAL"("username","password") VALUES ($1,$2) RETURNING *',[args.username, args.password])
            id = qResult.rows[0].id;
        }catch(e){
            console.log("[Error] Failed to Insert into USER_CONFIDENTIAL")
            client.release()
            return false;
        }

        //Make UserInfo
        try {
            let profileImgUrl = null
            if(args.hasOwnProperty('profileImg'))
            {
                //Upload Image and retrieve URL
            }
            let qResult = await client.query('INSERT INTO "USER_INFO"("FK_accountId","name","email","age","height","weight","profileImg","phoneNum","address") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
                    [id,args.name,args.email,args.age,args.height,args.weight,profileImgUrl,args.phoneNum,args.address])
            console.log(qResult);
            client.release()
        } catch(e) {
            console.log("[Error] Failed to Insert into User_Info")
            console.log(e);
            client.release()
            return false
        }

        try {
            let qResult = await client.query('INSERT INTO "CHANNEL"("FK_accountId") VALUES ($1)',[id])
            return true;
        }
        catch(e){
            return false;
        }
    }


  }