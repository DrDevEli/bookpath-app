import crypto from "crypto";
import User from "../models/User.js";
import emailService from "../services/emailService.js";
import { ApiError } from "../utils/errors.js";
import logger from "../config/logger.js";

/**
 * Generate a verification token and send verification email
 * @param {Object} user - User document
 * @returns {Promise<boolean>} - Success status
 */
export async function sendVerificationEmail(user) {
  try {
    // Generate a verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save token to user
    user.emailVerificationToken = token;
    user.emailVerificationExpires = expires;
    await user.save();

    // Send verification email
    const result = await emailService.sendVerificationEmail(
      user.email,
      token,
      user.username
    );

    if (!result.success) {
      logger.error("Failed to send verification email", {
        userId: user._id,
        error: result.error,
      });
      return false;
    }

    logger.info("Verification email sent", {
      userId: user._id,
      email: user.email,
    });

    return true;
  } catch (error) {
    logger.error("Error sending verification email", {
      userId: user?._id,
      error: error.message,
    });
    return false;
  }
}

/**
 * Verify email with token
 * @param {string} token - Verification token
 * @returns {Promise<Object>} - User object
 */
export async function verifyEmail(token) {
  try {
    // Find user with matching token that hasn't expired
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new ApiError(400, "Invalid or expired verification token");
    }

    // Mark email as verified and clear token
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    logger.info("Email verified successfully", {
      userId: user._id,
      email: user.email,
    });

    return user;
  } catch (error) {
    logger.error("Email verification failed", {
      token,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Resend verification email
 * @param {string} email - User email
 * @returns {Promise<boolean>} - Success status
 */
export async function resendVerificationEmail(email) {
  try {
    const user = await User.findOne({ email });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.emailVerified) {
      throw new ApiError(400, "Email is already verified");
    }

    // Check if a verification email was sent recently (within 15 minutes)
    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires > new Date(Date.now() + 15 * 60 * 1000)
    ) {
      throw new ApiError(
        429,
        "Verification email was sent recently. Please check your inbox or try again later."
      );
    }

    // Send new verification email
    const success = await sendVerificationEmail(user);

    if (!success) {
      throw new ApiError(500, "Failed to send verification email");
    }

    return true;
  } catch (error) {
    logger.error("Failed to resend verification email", {
      email,
      error: error.message,
    });
    throw error;
  }
}

export async function resendVerificationEmailHandler(req, res, next) {
  try {
    const email = req.user?.email || req.body?.email;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    await resendVerificationEmail(email);

    res.status(200).json({
      success: true,
      message: "Verification email sent (if applicable)",
    });
  } catch (error) {
    next(error);
  }
}
