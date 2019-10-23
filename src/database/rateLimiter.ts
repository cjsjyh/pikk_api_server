const { RateLimiterRedis } = require("rate-limiter-flexible")

const { GetRedisClient } = require("./redisConnect")

const rateLimiter = new RateLimiterRedis({
  redis: GetRedisClient(),
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
