import crypto from "crypto";
import User from "../models/User.js";
import emailService from "../services/emailService.js";
import { ApiError } from "../utils/errors.js";
import logger from "../config/logger.js";
import { cache } from "../utils/cache.js";

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<boolean>} - Success status
 */
export async function requestPasswordReset(email) {
  try {
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal that the user doesn't exist
      logger.info("Password reset requested for non-existent user", { email });
      return true;
    }

    // Check if a reset email was sent recently (within 15 minutes)
    const rateLimitKey = cache.key(`password_reset:${email}`, "rate_limit");
    const rateLimited = await cache.exists(rateLimitKey);

    if (rateLimited) {
      throw new ApiError(
        429,
        "Password reset email was sent recently. Please check your inbox or try again later."
      );
    }

    // Generate a reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to user
    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    await user.save();

    // Send password reset email
    const result = await emailService.sendPasswordResetEmail(
      user.email,
      token,
      user.username
    );

    if (!result.success) {
      logger.error("Failed to send password reset email", {
        userId: user._id,
        error: result.error,
      });
      return false;
    }

    // Set rate limit to prevent abuse
    await cache.set(rateLimitKey, true, 15 * 60); // 15 minutes

    logger.info("Password reset email sent", {
      userId: user._id,
      email: user.email,
    });

    return true;
  } catch (error) {
    logger.error("Error requesting password reset", {
      email,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Reset password with token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} - Success status
 */
export async function resetPassword(token, newPassword) {
  try {
    // Find user with matching token that hasn't expired
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new ApiError(400, "Invalid or expired reset token");
    }

    // Set new password and clear token
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // If email wasn't verified, verify it now
    if (!user.emailVerified) {
      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
    }

    await user.save();

    logger.info("Password reset successfully", {
      userId: user._id,
    });

    return true;
  } catch (error) {
    logger.error("Password reset failed", {
      token,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Validate reset token
 * @param {string} token - Reset token
 * @returns {Promise<boolean>} - Token validity
 */
export async function validateResetToken(token) {
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    return !!user;
  } catch (error) {
    logger.error("Error validating reset token", {
      token,
      error: error.message,
    });
    return false;
  }
}
