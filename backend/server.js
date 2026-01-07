import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import compression from "compression";
import passport from "./src/config/passport.js";
import { errorHandler } from "./src/utils/errors.js";
import authRoutes from "./src/routes/authRoutes.js";
import bookRoutes from "./src/routes/bookRoutes.js";
import collectionRoutes from "./src/routes/collectionRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import logger from "./src/config/logger.js";
import securityMiddleware from "./src/middleware/security.js";
import {
  validateEnv,
  getEnvConfig,
  validateRedisConfig
} from "./src/utils/envValidator.js";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

// Load environment variables
dotenv.config();

// Validate Redis configuration
validateRedisConfig();

// Get configuration from environment
const config = getEnvConfig({
  PORT: { type: "number", default: 3001 },
  NODE_ENV: { default: "development" },
  CORS_ORIGIN: { default: "*" },
  MONGODB_URI: { required: true },
  TRUST_PROXY: { type: "boolean", default: false },
});

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "BookPath API",
      version: "1.0.0",
      description: "API documentation for BookPath application",
    },
    servers: [
      {
        url: `http://localhost:${config.PORT || 3001}`,
        description: "Development server",
      },
      {
        url: "https://api.bookpath.eu",
        description: "Production server",
      },
    ],
  },
  apis: ["./src/routes/*.js"], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Validate required environment variables
validateEnv([
  "SESSION_SECRET",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "MONGODB_URI",
]);

// Initialize Express app
const app = express();
const PORT = config.PORT;

// Apply security middleware (includes helmet)
securityMiddleware(app);

// Configure CORS
const corsOptions = {
  origin: process.env.NODE_ENV === "production" 
    ? ["https://www.bookpath.eu", "https://bookpath.eu", "https://api.bookpath.eu"]
    : "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  credentials: true,
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));

// Add compression middleware
app.use(compression());

// Body parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Initialize passport
app.use(passport.initialize());

// Basic health check route
app.get("/health", async (req, res) => {
  // Check Redis connection
  let redisStatus = "disconnected";
  try {
    const redis = (await import("./src/config/redis.js")).default;
    await redis.ping();
    redisStatus = "connected";
  } catch (error) {
    logger.error("Redis health check failed", { error: error.message });
  }

  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    redis: redisStatus,
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
  });
});

// Cache monitoring endpoint
app.get("/api/chefaodacasa/cache/stats", async (req, res) => {
  try {
    const { cache } = await import("./src/utils/cache.js");
    const stats = cache.stats.get();

    // Calculate hit rate
    const total = stats.hits + stats.misses;
    const hitRate = total > 0 ? (stats.hits / total) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        hitRate: hitRate.toFixed(2) + "%",
        total,
        uptime: Math.floor((Date.now() - stats.lastReset) / 1000) + "s",
      },
    });
  } catch (error) {
    logger.error("Error getting cache stats", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Failed to get cache statistics",
    });
  }
});

// Cache reset endpoint
app.post("/api/chefaodacasa/cache/reset", async (req, res) => {
  try {
    const { cache } = await import("./src/utils/cache.js");
    const stats = cache.stats.reset();

    res.status(200).json({
      success: true,
      message: "Cache statistics reset successfully",
      data: stats,
    });
  } catch (error) {
    logger.error("Error resetting cache stats", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Failed to reset cache statistics",
    });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/users", userRoutes);

// Add Swagger documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "BookPath API Documentation",
  })
);

// Error handling
app.use(errorHandler);

// Connect to MongoDB with retry logic
const connectWithRetry = async (retryCount = 5, delay = 5000) => {
  try {
    const mongooseOptions = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      maxPoolSize: 10,
      minPoolSize: 2,
    };

    await mongoose.connect(config.MONGODB_URI, mongooseOptions);
    logger.info("Connected to MongoDB successfully");
    return true;
  } catch (err) {
    if (retryCount === 0) {
      logger.error("Failed to connect to MongoDB after multiple attempts", {
        error: err.message,
      });
      return false;
    }

    logger.warn(`MongoDB connection failed, retrying in ${delay}ms...`, {
      attemptsRemaining: retryCount,
      error: err.message,
    });

    await new Promise((resolve) => setTimeout(resolve, delay));
    return connectWithRetry(retryCount - 1, delay);
  }
};

// Graceful shutdown function
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, starting graceful shutdown`);

  // Close MongoDB connection
  if (mongoose.connection.readyState === 1) {
    logger.info("Closing MongoDB connection");
    await mongoose.connection.close();
    logger.info("MongoDB connection closed");
  }

  // Exit process
  logger.info("Exiting process");
  process.exit(0);
};

// Register shutdown handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server regardless of MongoDB connection status
const startServer = () => {
  const server = app.listen(PORT, () => {
    logger.info(`Server running in ${config.NODE_ENV} mode on port ${PORT}`);
    logger.info(
      `API documentation available at http://localhost:${PORT}/api-docs`
    );
  });

  // Set timeouts
  server.timeout = 30000; // 30 seconds
  server.keepAliveTimeout = 65000; // 65 seconds
  server.headersTimeout = 66000; // 66 seconds (slightly more than keepAliveTimeout)

  return server;
};
(async () => {
  const connected = await connectWithRetry();
  if (connected) {
    startServer();
  } else {
    logger.error("Could not start server due to MongoDB connection failure");
    process.exit(1);
  }
})();

export default app;
