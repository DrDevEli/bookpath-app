import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { getEnvConfig } from "../utils/envValidator.js";
import logger from "../config/logger.js";

/**
 * Configure and apply security middleware to Express app
 * @param {Object} app - Express application
 */
export default function securityMiddleware(app) {
  // Get environment configuration
  const config = getEnvConfig({
    NODE_ENV: { default: "development" },
    TRUST_PROXY: { type: "boolean", default: false },
    API_RATE_LIMIT: { type: "number", default: 100 },
    API_RATE_LIMIT_WINDOW_MS: { type: "number", default: 60000 }, // 1 minute
  });

  // Configure trust proxy if behind a reverse proxy
  if (config.TRUST_PROXY) {
    app.set("trust proxy", 1);
    logger.info("Trust proxy enabled");
  }

  // Use Helmet with enhanced security options
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // Consider removing unsafe-inline in production
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: "same-site" },
      dnsPrefetchControl: { allow: false },
      expectCt: { enforce: true, maxAge: 30 },
      frameguard: { action: "deny" },
      hsts: {
        maxAge: 15552000, // 180 days
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: { permittedPolicies: "none" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xssFilter: true,
    })
  );

  // Apply rate limiting to all routes
  const limiter = rateLimit({
    windowMs: config.API_RATE_LIMIT_WINDOW_MS,
    max: config.API_RATE_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 429,
      success: false,
      message: "Too many requests, please try again later.",
    },
    skip: (req) => req.path === "/health", // Skip rate limiting for health checks
    handler: (req, res, next, options) => {
      logger.warn("Rate limit exceeded", {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });
      res.status(429).json(options.message);
    },
  });

  app.use(limiter);

  // Additional security headers
  app.use((req, res, next) => {
    // Prevent browsers from detecting the MIME type of a response
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Disable caching for API responses
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    next();
  });
}
