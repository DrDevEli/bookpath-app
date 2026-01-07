/**
 * Authentication Controller
 *
 * This controller handles all authentication-related operations including:
 * - Password reset functionality
 * - Two-factor authentication (2FA)
 * - Token management (refresh, logout)
 * - Email verification
 *
 * Security is a critical aspect of this controller as it manages sensitive operations
 * like password changes and 2FA setup. All operations are logged for audit purposes.
 */

import speakeasy from "speakeasy";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import { ApiError } from "../utils/errors.js";
import { generateTokens } from "../utils/jwtUtils.js";
import { isJwtBlacklisted, whitelistJwt } from "../utils/authRedisUtils.js";
import logger from "../config/logger.js";
import * as emailVerificationController from "./emailVerificationController.js";
import * as passwordResetController from "./passwordResetController.js";

class AuthController {
  /**
   * Initiates the password reset process
   * Sends a password reset email to the user if their email is registered
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async requestPasswordReset(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new ApiError(400, "Email is required");
      }

      // Use the password reset controller to handle the request
      await passwordResetController.requestPasswordReset(email);

      res.status(200).json({
        success: true,
        message:
          "If your email is registered, you will receive a password reset link",
      });
    } catch (error) {
      logger.error("Password reset request error", {
        email: req.body?.email,
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Handles the actual password reset using a valid reset token
   * Validates the token and updates the user's password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        throw new ApiError(400, "Token and new password are required");
      }

      // Use the password reset controller to handle the reset
      await passwordResetController.resetPassword(token, newPassword);

      logger.info("Password reset successful");

      res.status(200).json({
        success: true,
        message:
          "Password reset successful. You can now log in with your new password.",
      });
    } catch (error) {
      logger.error("Password reset error", { error: error.message });
      next(error);
    }
  }

  /**
   * Sets up two-factor authentication for a user
   * Generates a secret key and recovery codes
   * Creates a QR code for easy setup with authenticator apps
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async setupTwoFactor(req, res, next) {
    try {
      const userId = req.user.id;

      // Generate real 2FA secret
      const secret = speakeasy.generateSecret({
        name: `BookApp:${req.user.email}`,
        issuer: "BookApp",
      });

      // Generate recovery codes
      const recoveryCodes = Array(5)
        .fill()
        .map(() => crypto.randomBytes(5).toString("hex").toUpperCase());

      // Save secret to user
      await User.findByIdAndUpdate(userId, {
        twoFactorSecret: secret.base32,
        recoveryCodes,
      });

      // Generate QR code
      // In a real implementation, this would be a data URL containing the QR code image
      const qrCodeUrl =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

      res.status(200).json({
        success: true,
        data: {
          secret: secret.base32,
          qrCode: qrCodeUrl,
          recoveryCodes: recoveryCodes,
        },
      });
    } catch (error) {
      logger.error("2FA setup error", {
        userId: req.user.id,
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Verifies and enables 2FA for a user
   * Validates the provided token against the stored secret
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async verifyAndEnableTwoFactor(req, res, next) {
    try {
      const { token } = req.body;
      const userId = req.user.id;

      const user = await User.findById(userId).select("+twoFactorSecret");

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // Verify token using speakeasy
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: token,
        window: 1, // Allow 1 step (30s) before/after current time
      });

      if (!verified) {
        logger.warn("Failed 2FA verification attempt", { userId });
        throw new ApiError(400, "Invalid verification code");
      }

      // Enable 2FA
      user.twoFactorEnabled = true;
      await user.save();

      logger.info("Two-factor authentication enabled", { userId });

      res.status(200).json({
        success: true,
        message: "Two-factor authentication enabled",
      });
    } catch (error) {
      logger.error("2FA verification error", {
        userId: req.user?.id,
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Verifies 2FA token during login
   * Generates new access and refresh tokens upon successful verification
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async verifyTwoFactor(req, res, next) {
    try {
      const { token, userId } = req.body;

      if (!token || !userId) {
        throw new ApiError(400, "Verification code and user ID are required");
      }

      const user = await User.findById(userId).select("+twoFactorSecret");
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // Verify token using speakeasy
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: token,
        window: 1, // Allow 1 step (30s) before/after current time
      });

      if (!verified) {
        logger.warn("Failed 2FA login attempt", { userId });
        throw new ApiError(401, "Invalid verification code");
      }

      // Generate tokens
      const { accessToken, refreshToken, jti } = generateTokens(
        user._id,
        user.role
      );

      // Add to whitelist
      await whitelistJwt(
        jti,
        user._id,
        parseInt(process.env.JWT_EXPIRES_IN) || 3600
      );

      // Log successful 2FA login
      const AuditLog = mongoose.model("AuditLog");
      await AuditLog.logAction(
        userId,
        "login_success",
        {
          twoFactorUsed: true,
        },
        req
      );

      logger.info("User logged in with 2FA", { userId });

      res.status(200).json({
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      logger.error("2FA login verification error", {
        userId: req.body.userId,
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Refreshes access and refresh tokens
   * Validates the current refresh token and issues new tokens
   * Blacklists the old refresh token for security
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async refreshTokens(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ApiError(400, "Refresh token is required");
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, {
        algorithms: ["HS256"],
      });

      // Check if token is blacklisted
      if (await isJwtBlacklisted(decoded.jti)) {
        throw new ApiError(401, "Token revoked");
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(
        decoded.sub,
        decoded.role
      );

      // Blacklist old refresh token
      const redis = require("../utils/redis.js").default;
      await redis.set(
        `jwt:blacklist:${decoded.jti}`,
        "1",
        "EX",
        parseInt(process.env.JWT_REFRESH_EXPIRES_IN) || 604800
      );

      logger.info("Tokens refreshed", { userId: decoded.sub });

      res.status(200).json({
        success: true,
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        next(new ApiError(401, "Refresh token expired"));
      } else if (error.name === "JsonWebTokenError") {
        next(new ApiError(401, "Invalid refresh token"));
      } else {
        next(error);
      }
    }
  }

  /**
   * Logs out user from all devices
   * Invalidates all existing tokens by incrementing the token version
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async logoutAll(req, res, next) {
    try {
      const userId = req.user.id;

      // Update user's tokenVersion to invalidate all tokens
      await User.findByIdAndUpdate(userId, {
        $inc: { tokenVersion: 1 },
      });

      logger.info("User logged out from all devices", { userId });

      res.status(200).json({
        success: true,
        message: "Logged out from all devices successfully",
      });
    } catch (error) {
      logger.error("Logout all error", {
        userId: req.user?.id,
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Verifies user's email address using a verification token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async verifyEmail(req, res, next) {
    try {
      const { token } = req.params;

      // Use the email verification controller to handle the verification
      await emailVerificationController.verifyEmail(token);

      logger.info("Email verified");

      res.redirect(`${process.env.FRONTEND_URL}/login?verified=true`);
    } catch (error) {
      logger.error("Email verification error", {
        token: req.params?.token,
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Resends the verification email to unverified users
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async resendVerificationEmail(req, res, next) {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId);
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      if (user.emailVerified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }

      // Use the email verification controller to resend the email
      await emailVerificationController.sendVerificationEmail(user);

      logger.info("Verification email resent", { userId });

      res.status(200).json({
        success: true,
        message: "Verification email has been sent",
      });
    } catch (error) {
      logger.error("Resend verification email error", {
        userId: req.user?.id,
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Disables two-factor authentication for a user
   * Requires password confirmation for security
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async disableTwoFactor(req, res, next) {
    try {
      const { password } = req.body;
      const userId = req.user.id;

      if (!password) {
        throw new ApiError(400, "Password is required to disable 2FA");
      }

      const user = await User.findById(userId).select("+password");

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // Verify password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        logger.warn("Failed 2FA disable attempt - incorrect password", {
          userId,
        });
        throw new ApiError(401, "Invalid password");
      }

      // Disable 2FA
      user.twoFactorEnabled = false;
      user.twoFactorSecret = undefined;
      await user.save();

      logger.info("Two-factor authentication disabled", { userId });

      res.status(200).json({
        success: true,
        message: "Two-factor authentication disabled",
      });
    } catch (error) {
      logger.error("Disable 2FA error", {
        userId: req.user?.id,
        error: error.message,
      });
      next(error);
    }
  }
}

export default AuthController;
