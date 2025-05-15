import Redis from 'ioredis';

const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  enableOfflineQueue: false,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
  connectTimeout: 10000
};

// Create Redis connection pool
const redisClient = new Redis.Cluster([redisOptions], {
  scaleReads: 'slave',
  redisOptions: {
    ...redisOptions,
    showFriendlyErrorStack: true
  }
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

export default redisClient;
