import { RateLimiterRedis } from "rate-limiter-flexible";
import redis from "../config/redis.js";
import { ApiError } from "../utils/errors.js";
import logger from "../config/logger.js";

// Define rate limiters for different endpoints
const loginRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "ratelimit:login",
  points: 5, // 5 attempts
  duration: 60 * 15, // per 15 minutes
  blockDuration: 60 * 30, // Block for 30 minutes after too many attempts
});

const apiRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "ratelimit:api",
  points: 100, // 100 requests
  duration: 60, // per 1 minute
});

// Higher limits for authenticated users
const authenticatedRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "ratelimit:auth",
  points: 300, // 300 requests
  duration: 60, // per 1 minute
});

// Admin users get even higher limits
const adminRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "ratelimit:chefaodacasa",
  points: 1000, // 1000 requests
  duration: 60, // per 1 minute
});

export const rateLimiterMiddleware = async (req, res, next) => {
  try {
    // Determine user role and create a unique key
    const role = req.user?.role || "anon";
    const key = `${role}:${req.user?.id || req.ip}:${req.method}:${req.path}`;

    // Select appropriate rate limiter based on path and authentication
    let rateLimiter;

    if (req.path.includes("/auth/login") || req.path.includes("/users/login")) {
      rateLimiter = loginRateLimiter;
    } else if (role === "chefaodacasa") {
      rateLimiter = adminRateLimiter;
    } else if (req.user) {
      rateLimiter = authenticatedRateLimiter;
    } else {
      rateLimiter = apiRateLimiter;
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimiter.consume(key);

    // Set rate limit headers
    res.set({
      "X-RateLimit-Limit": rateLimiter.points,
      "X-RateLimit-Remaining": rateLimitResult.remainingPoints,
      "X-RateLimit-Reset": Math.ceil(rateLimitResult.msBeforeNext / 1000),
    });

    next();
  } catch (error) {
    if (error.consumedPoints) {
      logger.warn("Rate limit exceeded", {
        ip: req.ip,
        path: req.path,
        user: req.user?.id,
      });

      res
        .status(429)
        .set({
          "Retry-After": Math.ceil(error.msBeforeNext / 1000),
        })
        .json({
          success: false,
          error: "Too many requests. Please try again later.",
          retryAfter: `${Math.ceil(error.msBeforeNext / 1000)} seconds`,
        });
    } else {
      logger.error("Rate limiting error", { error: error.message });
      next(new ApiError(500, "Rate limiting error"));
    }
  }
};

export default rateLimiterMiddleware;
