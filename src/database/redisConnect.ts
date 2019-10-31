const redis = require("redis")

export function GetRedisClient() {
  var redisConnection = redis.createClient({
    host: process.env.REDIS_HOST,
    port: 6379,
    enable_offline_queue: true
  })
  return redisConnection
}

export function GetRedis(key: string) {
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

export function SetRedis(key: string, value: string, timer: number = 3600) {
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
