const redis = require("redis")

export function GetRedisClient() {
  var redisConnection = redis.createClient({
    host: process.env.REDIS_HOST,
    port: 6379,
    enable_offline_queue: false
  })

  return redisConnection
}
