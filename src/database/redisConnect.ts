const redis = require("redis")

export function GetRedisClient() {
  var redisConnection
  if (process.env.MODE == "DEVELOPMENT") {
    redisConnection = redis.createClient({
      host: process.env.REDIS_HOST_DEVELOPMENT,
      port: 6379,
      enable_offline_queue: false
    })
  } else if (process.env.Mode == "DEPLOY") {
    redisConnection = redis.createClient({
      host: process.env.REDIS_HOST_DEVEOPMENT,
      port: 6379,
      enable_offline_queue: false
    })
  } else {
    redisConnection = redis.createClient({
      host: process.env.REDIS_HOST_LOCAL,
      port: 6379,
      enable_offline_queue: false
    })
  }
  return redisConnection
}
