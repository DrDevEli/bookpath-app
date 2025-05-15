import { RateLimiterRedis } from 'rate-limiter-flexible';            
import redisClient from '../config/redis.js';                        
                                                                     
const rateLimiter = new RateLimiterRedis({                           
  storeClient: redisClient,                                          
  keyPrefix: 'searchLimit',                                          
  points: 10, // 10 requests                                         
  duration: 60, // per 60 seconds                                    
  blockDuration: 300 // block for 5 minutes if exceeded              
});                                                                  
                                                                     
export const rateLimiterMiddleware = (req, res, next) => {           
  rateLimiter.consume(req.ip)                                        
    .then(() => next())                                              
    .catch(() => res.status(429).json({                              
      error: 'Too many requests'                                     
    }));                                                             
};   import { RateLimiterRedis } from 'rate-limiter-flexible';
import redisClient from '../config/redis.js';

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'searchLimit',
  points: 10, // 10 requests
  duration: 60, // per 60 seconds
  blockDuration: 300 // block for 5 minutes if exceeded
});

export const rateLimiterMiddleware = (req, res, next) => {
  rateLimiter.consume(req.ip)
    .then(() => next())
    .catch(() => res.status(429).json({ 
      error: 'Too many requests' 
    }));
};
