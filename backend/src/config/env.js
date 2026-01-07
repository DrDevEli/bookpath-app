/**
 * Primary Environment Configuration
 *
 * Uses envalid to validate and type-cast ALL environment variables at startup.
 * Provides defaults and ensures required variables exist.
 *
 * This should be used for all basic environment variable access.
 * For complex runtime validations, use the validators in envValidator.js
 */
import dotenv from "dotenv";
import { cleanEnv, str, num, url } from "envalid";

dotenv.config();

const env = cleanEnv(process.env, {
  MONGODB_URI: str({ desc: "MongoDB connection string" }),
  PORT: num({ default: 3001, desc: "Port to run the server on" }),
  JWT_SECRET: str({ desc: "32+ character secret for JWT signing" }),
  JWT_EXPIRES_IN: str({ default: "1h", desc: "JWT expiration time" }),
  JWT_REFRESH_SECRET: str({
    default: process.env.JWT_SECRET,
    desc: "Secret for refresh tokens (defaults to JWT_SECRET if not set)",
  }),
  JWT_REFRESH_EXPIRES_IN: str({
    default: "7d",
    desc: "Refresh token expiration",
  }),
  SESSION_SECRET: str({ desc: "Secret for session encryption" }),
  NODE_ENV: str({
    choices: ["development", "production", "test"],
    desc: "Current environment mode",
  }),
  REDIS_HOST: str({ default: "localhost", desc: "Redis server host" }),
  REDIS_PORT: num({ default: 17046, desc: "Redis server port" }),
  FRONTEND_URL: url({
    default: "http://localhost:3000",
    desc: "Base URL for frontend (used for CORS, etc)",
  }),
});

export default env;
