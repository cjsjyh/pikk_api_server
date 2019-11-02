import { logWithDate } from "../resolvers/Utils/stringUtil"

const redis = require("redis")

export function GetRedisClient() {
  var redisConnection = redis.createClient({
    host: process.env.REDIS_HOST,
    port: 6379,
    enable_offline_queue: true
  })
  return redisConnection
}

export function GetRedis(key: string): any {
  return new Promise((resolve, reject) => {
    let client
    try {
      client = GetRedisClient()
    } catch (e) {
      reject(e)
    }

    try {
      client.get(key, function(err, reply) {
        if (err) reject(err)
        client.end(true)
        resolve(reply)
      })
    } catch (e) {
      client.end(true)
      reject(e)
    }
  })
}

export function SetRedis(key: string, value: string, timer: number = 3600): any {
  return new Promise((resolve, reject) => {
    let client
    try {
      client = GetRedisClient()
    } catch (e) {
      reject(e)
    }

    try {
      client.set(key, value, "EX", timer, function(err, reply) {
        if (err) reject(err)
        client.end(true)
        resolve()
      })
    } catch (e) {
      client.end(true)
      reject(e)
    }
  })
}

export function DelCacheByPattern(pattern: string) {
  return new Promise((resolve, reject) => {
    let client
    try {
      client = GetRedisClient()
    } catch (e) {
      reject(e)
    }
    scan(pattern, client, "0", resolve, reject)
  })
}

function scan(pattern, redisClient, cursor, resolve, reject) {
  redisClient.scan(cursor, "MATCH", pattern, "COUNT", "1000", function(err, reply) {
    if (err) {
      redisClient.end(true)
      logWithDate("[Error] Failed to make connection with Redis")
      logWithDate(err)
      reject(err)
    }
    cursor = reply[0]

    var keys = reply[1]
    keys.forEach(function(key, i) {
      redisClient.del(key, function(deleteErr, deleteSuccess) {
        if (deleteErr) {
          logWithDate("[Error] Failed to delete Cache")
          logWithDate(deleteErr)
        }
      })
    })

    if (cursor === "0") {
      redisClient.end(true)
      return resolve("Success!")
    } else {
      return scan(pattern, redisClient, cursor, resolve, reject)
    }
  })
}
