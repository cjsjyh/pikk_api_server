const redis = require("redis")
const { RateLimiterRedis } = require("rate-limiter-flexible")

let redisClient

if (process.env.MODE == "DEVELOPMENT") {
  redisClient = redis.createClient({
    host: process.env.REDIS_HOST_DEVELOPMENT,
    port: 6379,
    enable_offline_queue: false
  })
} else {
  redisClient = redis.createClient({
    host: process.env.REDIS_HOST_DEPLOY,
    port: 6379,
    enable_offline_queue: false
  })
}

const rateLimiter = new RateLimiterRedis({
  redis: redisClient,
  keyPrefix: "middleware",
  points: 10, // 10 requests
  duration: 1 // per 1 second by IP
})

const rateLimiterMiddleware = (req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => {
      next()
    })
    .catch(() => {
      console.log(`[RATE LIMITER] ${req.ip} sending too many requests`)
      res.status(429).send("Too Many Requests")
    })
}

module.exports = rateLimiterMiddleware
