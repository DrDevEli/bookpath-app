/**
 * Authentication Middleware
 *
 * This module provides essential security middleware for the application:
 * - JWT-based authentication and authorization
 * - CSRF protection
 * - Role-based access control
 * - Email verification requirements
 *
 * These middleware functions are crucial for protecting routes and ensuring
 * proper access control throughout the application.
 */

import jwt from "jsonwebtoken";
import crypto from "crypto";
import { ApiError } from "../utils/errors.js";
import { isJwtBlacklisted } from "../utils/authRedisUtils.js";
import User from "../models/User.js";

/**
 * Main authentication middleware that handles JWT verification and role-based access control
 * @param {string[]} roles - Array of allowed roles for the route. Empty array means any authenticated user can access
 * @returns {Function} Express middleware function
 *
 * This middleware performs several security checks:
 * 1. Extracts and validates the JWT token
 * 2. Checks if the token is blacklisted
 * 3. Verifies the token's signature and expiration
 * 4. Validates the token version against the user's current version
 * 5. Checks role-based permissions if specified
 * 6. Attaches the authenticated user to the request object
 */
export const authMiddleware = (roles = []) => {
  return async (req, res, next) => {
    try {
      // 1. Extract token
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(" ")[1];

      if (!token) {
        throw new ApiError(401, "Authorization token required");
      }

      // 2. Check blacklist
      const decoded = jwt.decode(token);
      if (await isJwtBlacklisted(decoded.jti)) {
        throw new ApiError(401, "Token revoked");
      }

      // 3. Verify token
      const verified = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS256"],
        maxAge: process.env.JWT_EXPIRES_IN,
      });

      // 4. Check token version
      const user = await User.findById(verified.sub);
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      if (user.tokenVersion > verified.tokenVersion) {
        throw new ApiError(401, "Token invalidated");
      }

      // 5. Role check (if specified)
      if (roles.length && !roles.includes(verified.role)) {
        throw new ApiError(403, "Insufficient permissions");
      }

      // 6. Attach user to request
      req.user = {
        id: verified.sub,
        role: verified.role,
        jti: decoded.jti,
      };

      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        next(new ApiError(401, "Token expired"));
      } else if (error.name === "JsonWebTokenError") {
        next(new ApiError(401, "Invalid token"));
      } else {
        next(error);
      }
    }
  };
};

/**
 * CSRF Protection Middleware
 *
 * Prevents Cross-Site Request Forgery attacks by validating that requests
 * include a valid CSRF token that matches the one stored in the cookie.
 * This ensures that requests are coming from the legitimate frontend application.
 */
export const csrfProtection = (req, res, next) => {
  try {
    const csrfToken = req.headers["x-csrf-token"];
    const expectedToken = req.cookies["csrf-token"];

    if (!csrfToken || !expectedToken || csrfToken !== expectedToken) {
      throw new ApiError(403, "CSRF token validation failed");
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * CSRF Token Generation Middleware
 *
 * Generates a new CSRF token and sets it as an HTTP-only cookie.
 * The token is also attached to res.locals for the frontend to use in subsequent requests.
 *
 * Security features:
 * - Uses cryptographically secure random bytes
 * - Sets secure cookie options (httpOnly, secure, sameSite)
 * - 24-hour expiration
 */
export const generateCsrfToken = (req, res, next) => {
  try {
    const token = crypto.randomBytes(32).toString("hex");

    // Set cookie with httpOnly, secure, and sameSite options
    res.cookie("csrf-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Attach token to response for frontend to use in headers
    res.locals.csrfToken = token;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Pre-configured role-based middleware
 * These are convenience wrappers around authMiddleware for common role checks
 */
export const adminOnly = authMiddleware(["chefaodacasa"]);
export const userOnly = authMiddleware(["user"]);

/**
 * Email Verification Check Middleware
 *
 * Ensures that the user has verified their email address before allowing access
 * to protected routes. This is important for:
 * - Preventing spam accounts
 * - Ensuring valid user contact information
 * - Maintaining data quality
 */
export const requireVerifiedEmail = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (!user.emailVerified) {
      throw new ApiError(403, "Email verification required");
    }

    next();
  } catch (error) {
    next(error);
  }
};
