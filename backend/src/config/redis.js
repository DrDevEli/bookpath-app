// config/redis.js
import Redis from "ioredis";
import logger from "./logger.js";
import { getEnvConfig } from "../../src/utils/envValidator.js";

// Get Redis configuration from environment variables
const redisConfig = getEnvConfig({
  REDIS_URL: { default: "" },
  REDIS_HOST: { default: "localhost" },
  REDIS_PORT: { type: "number", default: "6379" },
  REDIS_PASSWORD: { default: "" },
  REDIS_USERNAME: { default: "" },
  REDIS_DB: { type: "number", default: 0 },
  REDIS_TLS_ENABLED: { type: "boolean", default: false },
  REDIS_CONNECT_TIMEOUT: { type: "number", default: 5000 },
  REDIS_MAX_RETRIES: { type: "number", default: 3 },
  REDIS_RETRY_DELAY: { type: "number", default: 1000 },
  NODE_ENV: { default: "development" },
});

// Define Redis connection options
const redisOptions = {
  socket: {
    reconnectStrategy: (retries) => {
      const maxRetries = redisConfig.REDIS_MAX_RETRIES || 20;
      const baseDelay = redisConfig.REDIS_RETRY_DELAY || 100;

      if (retries > maxRetries) {
        logger.error("Redis connection failed after maximum retries");
        return new Error("Max retries reached");
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, retries) + Math.random() * 100,
        5000 // Max 5 seconds
      );

      logger.info(
        `Redis reconnecting attempt ${retries}, next try in ${delay}ms`
      );
      return delay;
    },
  },
  enableOfflineQueue: true, // Buffer commands during disconnects
  maxRetriesPerRequest: null, // Retry forever
  connectTimeout: redisConfig.REDIS_CONNECT_TIMEOUT, // Connection timeout
  tls: redisConfig.REDIS_TLS_ENABLED ? {} : undefined, // Enable TLS if configured
};

// Create a mock Redis client for development if Redis is not available
class MockRedis {
  constructor() {
    this.store = new Map();
    this.connected = true;
    logger.info(
      "Using mock Redis client - data will not persist between restarts"
    );
  }

  // Add ping method for connection testing
  async ping() {
    return "PONG";
  }

  async get(key) {
    return this.store.get(key);
  }

  async set(key, value, ...args) {
    if (args.length > 0 && args[0] === "EX") {
      this.store.set(key, value);
      setTimeout(() => {
        this.store.delete(key);
      }, args[1] * 1000);
      return "OK";
    }
    this.store.set(key, value);
    return "OK";
  }

  async del(key) {
    return this.store.delete(key) ? 1 : 0;
  }

  async incr(key) {
    const value = this.store.get(key);
    const newValue = value ? parseInt(value) + 1 : 1;
    this.store.set(key, newValue.toString());
    return newValue;
  }

  async expire(key, seconds) {
    if (this.store.has(key)) {
      setTimeout(() => {
        this.store.delete(key);
      }, seconds * 1000);
      return 1;
    }
    return 0;
  }

  async sadd(key, ...members) {
    let set = this.store.get(key);
    if (!set) {
      set = new Set();
      this.store.set(key, set);
    }
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    return added;
  }

  pipeline() {
    return {
      set: (...args) => {
        this.set(...args);
        return this;
      },
      sadd: (...args) => {
        this.sadd(...args);
        return this;
      },
      del: (...args) => {
        this.del(...args);
        return this;
      },
      exec: async () => {
        return [];
      },
    };
  }

  async smembers(key) {
    const set = this.store.get(key);
    return set ? Array.from(set) : [];
  }
}

let redis;

try {
  const redisClient = redisConfig.REDIS_URL
    ? new Redis(redisConfig.REDIS_URL, redisOptions)
    : new Redis({
        host: redisConfig.REDIS_HOST,
        port: redisConfig.REDIS_PORT,
        password: redisConfig.REDIS_PASSWORD,
        ...redisOptions,
      });

  // Connection event handlers
  redisClient.on("connect", () => {
    logger.info("Redis connected");
  });

  redisClient.on("ready", () => {
    logger.info("Redis ready");
  });

  redisClient.on("reconnecting", () => {
    logger.warn("Redis reconnecting...");
  });

  redisClient.on("error", (error) => {
    logger.error("Redis error", { error: error.message });
  });

  redisClient.on("end", () => {
    logger.warn("Redis connection closed");
  });

  redis = redisClient;
} catch (error) {
  logger.warn("Redis connection failed, falling back to mock implementation", {
    error: error.message,
  });
  redis = new MockRedis();
}

export default redis;
