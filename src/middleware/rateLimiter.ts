const { RateLimiterRedis } = require("rate-limiter-flexible")
const { GetRedisClient } = require("../database/redisConnect")
var logger = require("../tools/logger")

const redisClient = GetRedisClient()
const rateLimiter = new RateLimiterRedis({
  redis: redisClient,
  keyPrefix: "ratelimiter",
  points: 30, // 10 requests
  duration: 1 // per 1 second by IP
})

const rateLimiterMiddleware = (req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => {
      next()
    })
    .catch(() => {
      logger.warn(`[RATE LIMITER] ${req.ip} sending too many requests`)
      res.status(429).send("Too Many Requests")
    })
}

module.exports = rateLimiterMiddleware
