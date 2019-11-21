var logger = require("../tools/logger")
const redis = require("redis")

export function GetRedisClient() {
  var redisConnection
  if(process.env.MODE != "DEPLOY")
  {
    redisConnection = redis.createClient({
      host: process.env.REDIS_HOST,
      port: 6379,
      password: process.env.REDIS_PASSWORD,
      enable_offline_queue: true
    })
  } else {
    redisConnection = redis.createClient({
      host: process.env.REDIS_HOST,
      port: 6379,
      enable_offline_queue: true
    })
  }
  return redisConnection
}

export function PushRedisQueue(key: string, value: string): any {
  return new Promise((resolve, reject) => {
    let client
    try {
      client = GetRedisClient()
    } catch (e) {
      reject(e)
    }

    try {
      client.rpush(key, value, function(err, reply) {
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

export function PopRedisQueue(key: string): any {
  return new Promise((resolve, reject) => {
    let client
    try {
      client = GetRedisClient()
    } catch (e) {
      reject(e)
    }

    try {
      client.lpop(key, function(err, reply) {
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

export function RedisQueueLength(key: string): any {
  return new Promise((resolve, reject) => {
    let client
    try {
      client = GetRedisClient()
    } catch (e) {
      reject(e)
    }

    try {
      client.llen(key, function(err, reply) {
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
  redisClient.scan(cursor, "MATCH", pattern, "COUNT", "1000", async function(err, reply) {
    if (err) {
      redisClient.end(true)
      logger.warn("Failed to make connection with Redis")
      logger.error(err)
      reject(err)
    }
    cursor = reply[0]
    var keys = reply[1]
    await Promise.all(
      keys.map(key => {
        return new Promise((resolve, reject) => {
          redisClient.del(key, function(deleteErr, deleteSuccess) {
            if (deleteErr) {
              logger.warn("Failed to delete Cache")
              logger.error(deleteErr)
              reject()
            }
            resolve()
          })
        })
      })
    )

    if (cursor === "0") {
      redisClient.end(true)
      return resolve("Success!")
    } else {
      return scan(pattern, redisClient, cursor, resolve, reject)
    }
  })
}
