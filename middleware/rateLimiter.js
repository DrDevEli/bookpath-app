import { RateLimiterRedis } from 'rate-limiter-flexible';
import redisClient from '../config/redis.js';

/**
 * Rate limiter config:
 * - 10 points per 60 seconds
 * - 5 minutes block on exceeded points
 */
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rateLimit',
  points: 10,
  duration: 60,
  blockDuration: 300,
});

/**
 * Custom rate limiter middleware
 * Key is based on user ID (if logged in) and/or API endpoint path.
 */
export const rateLimiterMiddleware = (req, res, next) => {
  // Get user ID if authenticated, else null
  const userId = req.user ? req.user.id : null;

  // Use request path as part of the key (without query params)
  const endpoint = req.path;

  // Build key string: prefix + user or IP + endpoint
  // If userId exists, rate limit per user per endpoint,
  // else rate limit per IP per endpoint.
  const key = userId
    ? `user:${userId}:${endpoint}`
    : `ip:${req.ip}:${endpoint}`;

  rateLimiter.consume(key)
    .then(() => next())
    .catch(() => {
      res.status(429).json({
        error: 'Too many requests, please try again later.'
      });
    });
};
