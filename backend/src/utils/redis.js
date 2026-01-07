import redis from "../config/redis.js";
import logger from "../config/logger.js";

/**
 * Cache data with TTL and optional tags for invalidation
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {string[]} tags - Tags for cache invalidation
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<boolean>} Success status
 */
export const cacheWithTags = async (key, data, tags = [], ttl = 3600) => {
  try {
    const pipeline = redis.pipeline();

    // Store the actual data
    pipeline.set(key, JSON.stringify(data), "EX", ttl);

    // Associate this key with provided tags for easier invalidation
    for (const tag of tags) {
      pipeline.sadd(`tag:${tag}`, key);
      // Set expiry on tag to avoid memory leaks
      pipeline.expire(`tag:${tag}`, ttl * 2);
    }

    await pipeline.exec();
    logger.debug("Data cached", { key, tags, ttl });
    return true;
  } catch (error) {
    logger.error("Redis cache error", { error: error.message, key });
    return false;
  }
};

/**
 * Get cached data
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached data or null if not found
 */
export const getCached = async (key) => {
  try {
    const data = await redis.get(key);
    if (!data) {
      logger.debug("Cache miss", { key });
      return null;
    }

    logger.debug("Cache hit", { key });
    return JSON.parse(data);
  } catch (error) {
    logger.error("Redis get error", { error: error.message, key });
    return null;
  }
};

/**
 * Invalidate cache by tags
 * @param {string[]} tags - Tags to invalidate
 * @returns {Promise<boolean>} Success status
 */
export const invalidateByTags = async (tags = []) => {
  try {
    const pipeline = redis.pipeline();
    let keysDeleted = 0;

    for (const tag of tags) {
      // Get all keys associated with this tag
      const keys = await redis.smembers(`tag:${tag}`);

      // Delete all these keys
      if (keys.length > 0) {
        pipeline.del(...keys);
        keysDeleted += keys.length;
      }

      // Delete the tag itself
      pipeline.del(`tag:${tag}`);
    }

    await pipeline.exec();
    logger.info("Cache invalidated by tags", { tags, keysDeleted });
    return true;
  } catch (error) {
    logger.error("Redis invalidation error", { error: error.message, tags });
    return false;
  }
};

/**
 * Set a simple cache key with TTL
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<boolean>} Success status
 */
export const setCache = async (key, data, ttl = 3600) => {
  try {
    await redis.set(key, JSON.stringify(data), "EX", ttl);
    logger.debug("Data cached", { key, ttl });
    return true;
  } catch (error) {
    logger.error("Redis set error", { error: error.message, key });
    return false;
  }
};

/**
 * Delete a cache key
 * @param {string} key - Cache key to delete
 * @returns {Promise<boolean>} Success status
 */
export const deleteCache = async (key) => {
  try {
    await redis.del(key);
    logger.debug("Cache key deleted", { key });
    return true;
  } catch (error) {
    logger.error("Redis delete error", { error: error.message, key });
    return false;
  }
};

export default redis;
