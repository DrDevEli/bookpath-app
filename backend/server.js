import "dotenv/config"; // MUST be first — loads .env before any module reads process.env
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import compression from "compression";
import passport from "./src/config/passport.js";
import { errorHandler } from "./src/utils/errors.js";
import authRoutes from "./src/routes/authRoutes.js";
import bookRoutes from "./src/routes/bookRoutes.js";
import collectionRoutes from "./src/routes/collectionRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import recommendationRoutes from "./src/routes/recommendationRoutes.js";
import libraryRoutes from "./src/routes/libraryRoutes.js";
import analyticsRoutes from "./src/routes/analyticsRoutes.js";
import seoRoutes from "./src/routes/seoRoutes.js";
import subscriberRoutes from "./src/routes/subscriberRoutes.js";
import logger from "./src/config/logger.js";
import securityMiddleware from "./src/middleware/security.js";
import {
  validateEnv,
  getEnvConfig,
  validateRedisConfig
} from "./src/utils/envValidator.js";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

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
        url: `http://localhost:${config.PORT || 3001}/api`,
        description: "Development server",
      },
      {
        url: "https://api.bookpath.org/api",
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
// Bind to loopback only — nginx is the only public entrypoint. The backend
// must never listen on a public interface (defense in depth; ufw also blocks it).
const HOST = process.env.HOST || "127.0.0.1";

// Apply security middleware (includes helmet)
securityMiddleware(app);

// Configure CORS
const corsOptions = {
  origin: config.NODE_ENV === "production" 
    ? ["https://www.bookpath.org", "https://bookpath.org", "https://api.bookpath.org"]
    : ["http://localhost:3000", "http://127.0.0.1:3000"], // Allow both localhost variants
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Requested-With"],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

// Add compression middleware
app.use(compression());

// Body parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Initialize passport
app.use(passport.initialize());

// Health check route — minimal payload for monitors; no env/uptime disclosure.
app.get("/health", async (req, res) => {
  let redisStatus = "disconnected";
  try {
    const redis = (await import("./src/config/redis.js")).default;
    await redis.ping();
    redisStatus = "connected";
  } catch (error) {
    logger.error("Redis health check failed", { error: error.message });
  }

  res.status(200).json({
    status: mongoose.connection.readyState === 1 && redisStatus === "connected" ? "ok" : "degraded",
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    redis: redisStatus,
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/subscribers", subscriberRoutes);

// SEO landing pages (server-rendered HTML at crawlable root paths)
app.use("/", seoRoutes);

// Swagger documentation — development only (audit M5: full API surface was
// publicly exposed on production via /api-docs).
if (process.env.NODE_ENV !== "production") {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "BookPath API Documentation",
    })
  );
} else {
  app.use("/api-docs", (req, res) => res.status(404).json({ success: false, message: "Not found" }));
}

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
const startServer = async () => {
  const server = app.listen(PORT, HOST, () => {
    logger.info(`Server running in ${config.NODE_ENV} mode on port ${PORT}`);
    logger.info(
      `API documentation available at http://localhost:${PORT}/api-docs`
    );
  });

  // Set timeouts
  server.timeout = 30000; // 30 seconds
  server.keepAliveTimeout = 65000; // 65 seconds
  server.headersTimeout = 66000; // 66 seconds (slightly more than keepAliveTimeout)

  // Initialize featured books cache in the background (non-blocking)
  try {
    const featuredBooksService = (await import("./src/services/featuredBooksService.js")).default;
    // Run initialization asynchronously without blocking server start
    featuredBooksService.initializeFeaturedBooks().catch((error) => {
      logger.error("Failed to initialize featured books cache", {
        error: error.message,
      });
    });
  } catch (error) {
    logger.warn("Could not initialize featured books service", {
      error: error.message,
    });
  }

  return server;
};
(async () => {
  const connected = await connectWithRetry();
  if (connected) {
    await startServer();
  } else {
    logger.error("Could not start server due to MongoDB connection failure");
    process.exit(1);
  }
})();

export default app;
