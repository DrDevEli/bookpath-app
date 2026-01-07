import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import logger from "../config/logger.js";
import { isJwtWhitelisted } from "./authRedisUtils.js";

/**
 * Generate access and refresh tokens for a user
 * @param {string} userId - The user ID
 * @param {string} role - The user's role
 * @param {number} tokenVersion - The user's token version (for invalidation)
 * @returns {Object} Object containing accessToken, refreshToken, and jti
 */
/**
 * Generate access and refresh tokens for a user
 * @param {string} userId - The user ID
 * @param {string} role - The user's role
 * @param {number} [tokenVersion=Date.now()] - Token version for invalidation
 * @returns {Promise<{accessToken: string, refreshToken: string, jti: string}>} Token objects
 * @throws {Error} If token generation fails
 */
export const generateTokens = async (
  userId,
  role,
  tokenVersion = Date.now()
) => {
  try {
    const jti = uuidv4();

    // Access token with shorter expiry
    const accessToken = jwt.sign(
      {
        sub: userId,
        role,
        jti,
        tokenVersion,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "15m",
        algorithm: "HS256",
        ...(process.env.JWT_ISSUER ? { issuer: process.env.JWT_ISSUER } : {}),
        ...(process.env.JWT_AUDIENCE
          ? { audience: process.env.JWT_AUDIENCE }
          : {}),
      }
    );

    // Refresh token with longer expiry
    const refreshToken = jwt.sign(
      {
        sub: userId,
        role,
        jti: uuidv4(),
        tokenVersion,
        type: "refresh",
      },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
        algorithm: "HS256",
        ...(process.env.JWT_ISSUER ? { issuer: process.env.JWT_ISSUER } : {}),
        ...(process.env.JWT_AUDIENCE
          ? { audience: process.env.JWT_AUDIENCE }
          : {}),
      }
    );

    logger.debug("Tokens generated", { userId, role });
    return { accessToken, refreshToken, jti };
  } catch (error) {
    logger.error("Token generation error", { userId, error: error.message });
    throw new Error("Failed to generate authentication tokens");
  }
};

/**
 * Verify a JWT token
 * @param {string} token - The token to verify
 * @param {boolean} isRefresh - Whether this is a refresh token
 * @returns {Object} The decoded token payload
 */
export const verifyToken = async (token, isRefresh = false) => {
  try {
    const secret = isRefresh
      ? process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      : process.env.JWT_SECRET;

    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      ...(process.env.JWT_ISSUER ? { issuer: process.env.JWT_ISSUER } : {}),
      ...(process.env.JWT_AUDIENCE
        ? { audience: process.env.JWT_AUDIENCE }
        : {}),
    });

    // For access tokens, check whitelist
    if (!isRefresh && decoded.jti) {
      const isWhitelisted = await isJwtWhitelisted(decoded.jti, decoded.sub);
      if (!isWhitelisted) {
        throw new Error("Token not whitelisted");
      }
    }

    return decoded;
  } catch (error) {
    logger.warn("Token verification failed", { error: error.message });
    throw error;
  }
};

/**
 * Decode a JWT token without verification
 * @param {string} token - The token to decode
 * @returns {Object|null} The decoded token payload or null if invalid
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.warn("Token decode failed", { error: error.message });
    return null;
  }
};
