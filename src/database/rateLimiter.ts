const redis = require("redis")
const { RateLimiterRedis } = require("rate-limiter-flexible")

const redisClient = redis.createClient({
  host: "pickk-api-server.rt04yt.ng.0001.apn2.cache.amazonaws.com",
  port: 6379,
  enable_offline_queue: false
})

const rateLimiter = new RateLimiterRedis({
  redis: redisClient,
  keyPrefix: "middleware",
  points: 10, // 10 requests
  duration: 10 // per 1 second by IP
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
