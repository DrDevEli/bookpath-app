import redis from "../config/redis.js";
import logger from "../config/logger.js";

const DEFAULT_TTL = 3600; // 1 hour
const DEFAULT_PREFIX =
  process.env.NODE_ENV === "test" ? "test:" : "bookpath-cache:";

// Cache statistics for monitoring
const cacheStats = {
  hits: 0,
  misses: 0,
  errors: 0,
  sets: 0,
  lastReset: Date.now(),
};

/**
 * Cache utility for Redis operations with error handling
 */
export const cache = {
  // Cache statistics methods
  stats: {
    get: () => ({ ...cacheStats }),
    reset: () => {
      cacheStats.hits = 0;
      cacheStats.misses = 0;
      cacheStats.errors = 0;
      cacheStats.sets = 0;
      cacheStats.lastReset = Date.now();
      return { ...cacheStats };
    },
  },
  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Parsed value or null if not found
   */
  get: async (key) => {
    try {
      const prefixedKey = key.startsWith(DEFAULT_PREFIX)
        ? key
        : `${DEFAULT_PREFIX}${key}`;
      const value = await redis.get(prefixedKey);

      if (!value) {
        cacheStats.misses++;
        return null;
      }

      cacheStats.hits++;
      try {
        return JSON.parse(value);
      } catch (e) {
        logger.warn("JSON failed, returning raw value", {
          error: e.message,
          key,
        });
        return value; // Return as-is if not JSON
      }
    } catch (error) {
      cacheStats.errors++;
      logger.error("Cache get error", { key, error: error.message });
      return null;
    }
  },

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache (will be stringified)
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} - Success status
   */
  set: async (key, value, ttl = DEFAULT_TTL) => {
    try {
      // Don't cache null or undefined values
      if (value === null || value === undefined) {
        return false;
      }

      const prefixedKey = key.startsWith(DEFAULT_PREFIX)
        ? key
        : `${DEFAULT_PREFIX}${key}`;
      const stringValue =
        typeof value === "string" ? value : JSON.stringify(value);
      await redis.set(prefixedKey, stringValue, "EX", ttl);
      cacheStats.sets++;
      return true;
    } catch (error) {
      cacheStats.errors++;
      logger.error("Cache set error", { key, error: error.message });
      return false;
    }
  },

  /**
   * Delete a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  del: async (key) => {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error("Cache delete error", { key, error: error.message });
      return false;
    }
  },

  /**
   * Set multiple cache entries with the same TTL
   * @param {Object} entries - Key-value pairs to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} - Success status
   */
  mset: async (entries, ttl = DEFAULT_TTL) => {
    try {
      const pipeline = redis.pipeline();

      for (const [key, value] of Object.entries(entries)) {
        const stringValue =
          typeof value === "string" ? value : JSON.stringify(value);
        pipeline.set(key, stringValue, "EX", ttl);
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error("Cache mset error", { error: error.message });
      return false;
    }
  },

  /**
   * Get multiple values from cache
   * @param {Array<string>} keys - Array of cache keys
   * @returns {Promise<Object>} - Object with key-value pairs
   */
  mget: async (keys) => {
    try {
      const values = await redis.mget(keys);
      const result = {};

      keys.forEach((key, index) => {
        const value = values[index];
        if (value) {
          try {
            result[key] = JSON.parse(value);
          } catch (e) {
            result[key] = value;
            console.error(e);
          }
        } else {
          result[key] = null;
        }
      });

      return result;
    } catch (error) {
      logger.error("Cache mget error", { keys, error: error.message });
      return {};
    }
  },

  /**
   * Check if a key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - True if key exists
   */
  exists: async (key) => {
    try {
      const prefixedKey = key.startsWith(DEFAULT_PREFIX)
        ? key
        : `${DEFAULT_PREFIX}${key}`;
      const result = await redis.exists(prefixedKey);
      return result === 1;
    } catch (error) {
      logger.error("Cache exists error", { key, error: error.message });
      return false;
    }
  },

  /**
   * Create a prefixed cache key
   * @param {string} key - Base key
   * @param {string} namespace - Optional namespace
   * @returns {string} - Prefixed key
   */
  key: (key, namespace = "") => {
    return namespace
      ? `${DEFAULT_PREFIX}${namespace}:${key}`
      : `${DEFAULT_PREFIX}${key}`;
  },

  /**
   * Flush all keys with the current prefix
   * @returns {Promise<boolean>} - Success status
   */
  flushPrefix: async () => {
    try {
      const keys = await redis.keys(`${DEFAULT_PREFIX}*`);

      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info(
          `Flushed ${keys.length} keys with prefix ${DEFAULT_PREFIX}`
        );
      }

      return true;
    } catch (error) {
      logger.error("Cache flush error", { error: error.message });
      return false;
    }
  },
};
