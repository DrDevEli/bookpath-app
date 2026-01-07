import { ValidationError } from "./errors.js";
import logger from "../config/logger.js";
import { isIP } from "net";
import validator from "validator";

/**
 * ADVANCED VALIDATION UTILITIES
 *
 * These functions provide runtime validation for environment variables
 * when you need more complex checks than what envalid provides.
 * They can be used to ensure environment variables
 */

/**
 * Validates required environment variables (runtime check)
 * @param {Array<string>} requiredVars - List of required environment variables
 * @throws {Error} If any required variable is missing
 */
export function validateEnv(requiredVars = []) {
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables: ${missing.join(
      ", "
    )}`;
    logger.error(errorMessage);
    throw new ValidationError(errorMessage);
  }
}

/**
 * Validates if environment variable contains a valid email address
 * @param {string} varName - Environment variable name
 * @throws {ValidationError} If value is not a valid email
 */
export function validateEmail(varName) {
  const value = process.env[varName];
  if (value && !validator.isEmail(value)) {
    const errorMessage = `Invalid email format in ${varName}`;
    logger.error(errorMessage);
    throw new ValidationError(errorMessage);
  }
}

/**
 * Validates if environment variable contains a valid URL
 * @param {string} varName - Environment variable name
 * @param {Object} [options] - Validation options
 * @throws {ValidationError} If value is not a valid URL
 */
export function validateUrl(varName, options = {}) {
  const value = process.env[varName];
  if (value && !validator.isURL(value, options)) {
    const errorMessage = `Invalid URL format in ${varName}`;
    logger.error(errorMessage);
    throw new ValidationError(errorMessage);
  }
}

/**
 * Validates if environment variable contains a valid port number
 * @param {string} varName - Environment variable name
 * @throws {ValidationError} If value is not a valid port
 */
export function validatePort(varName) {
  const value = process.env[varName];
  const port = parseInt(value, 10);

  if (isNaN(port)) {
    const errorMessage = `Invalid port number in ${varName}`;
    logger.error(errorMessage);
    throw new ValidationError(errorMessage);
  }

  if (port < 1 || port > 65535) {
    const errorMessage = `Port number in ${varName} must be between 1 and 75535`;
    logger.error(errorMessage);
    throw new ValidationError(errorMessage);
  }
}

/**
 * Validates if environment variable contains a valid IP address
 * @param {string} varName - Environment variable name
 * @throws {ValidationError} If value is not a valid IP
 */
export function validateIp(varName) {
  const value = process.env[varName];
  if (value && !isIP(value)) {
    const errorMessage = `Invalid IP address in ${varName}`;
    logger.error(errorMessage);
    throw new ValidationError(errorMessage);
  }
}

/**
 * Validates if a numeric environment variable is within range
 * @param {string} varName - Environment variable name
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @throws {ValidationError} If value is out of range
 */
export function validateNumericRange(varName, min, max) {
  const value = parseFloat(process.env[varName]);
  if (isNaN(value)) {
    const errorMessage = `Invalid number in ${varName}`;
    logger.error(errorMessage);
    throw new ValidationError(errorMessage);
  }

  if (value < min || value > max) {
    const errorMessage = `${varName} must be between ${min} and ${max}`;
    logger.error(errorMessage);
    throw new ValidationError(errorMessage);
  }
}

/**
 * Validates Redis connection configuration
 * @returns {boolean} - True if configuration is valid
 */
export function validateRedisConfig() {
  try {
    // Accept REDIS_URL as a valid config
    if (process.env.REDIS_URL) {
      return true;
    }
    const redisHost = process.env.REDIS_HOST;
    // const redisPort = process.env.REDIS_PORT;
    const redisPassword = process.env.REDIS_PASSWORD;

    if (!redisHost) {
      throw new ValidationError("Redis host not configured");
    }

    validatePort("REDIS_PORT");

    if (!redisPassword) {
      throw new ValidationError("Redis password not configured");
    }

    return true;
  } catch (error) {
    logger.error("Redis configuration validation failed", {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Validates and returns environment variables with defaults
 * @param {Object} config - Configuration object with variable names and default values
 * @returns {Object} - Object with validated environment variables
 */
export function getEnvConfig(config = {}) {
  const result = {};

  for (const [key, options] of Object.entries(config)) {
    const {
      required = false,
      default: defaultValue,
      type = "string",
    } = options;

    if (required && !process.env[key]) {
      const errorMessage = `Missing required environment variable: ${key}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    let value = process.env[key] || defaultValue;

    // Type conversion
    if (value !== undefined) {
      if (type === "number") {
        value = Number(value);
      } else if (type === "boolean") {
        value = value === "true" || value === "1" || value === true;
      } else if (type === "json") {
        try {
          value = JSON.parse(value);
        } catch {
          logger.error(`Invalid JSON in environment variable ${key}`);
          value = defaultValue;
        }
      }
    }

    result[key] = value;
  }

  return result;
}
