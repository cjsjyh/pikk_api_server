import { logWithDate } from "../resolvers/Utils/stringUtil"

const { RateLimiterRedis } = require("rate-limiter-flexible")
const { GetRedisClient } = require("../database/redisConnect")

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
      logWithDate(`[RATE LIMITER] ${req.ip} sending too many requests`)
      res.status(429).send("Too Many Requests")
    })
}

module.exports = {
  rateLimiterMiddleware: rateLimiterMiddleware,
  redisClient: redisClient
}
