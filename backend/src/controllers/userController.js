import User from "../models/User.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/errors.js";
import { generateTokens } from "../utils/jwtUtils.js";
import logger from "../config/logger.js";
import crypto from "crypto";
import {
  incrementLoginAttempts,
  clearLoginAttempts,
  removeFromWhitelist,
  blacklistJwt,
} from "../utils/authRedisUtils.js";

class UserController {
  static async register(req, res, next) {
    try {
      const { username, email, password } = req.body;

      // Validate input
      if (!username || !email || !password) {
        throw new ApiError(400, "Username, email and password are required");
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        throw new ApiError(
          409,
          "User with this email or username already exists"
        );
      }

      // Create new user
      const user = await User.create({
        username,
        email,
        password,
        role: "user",
        preferences: {
          theme: "light",
          emailNotifications: true,
        },
      });

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      user.emailVerificationToken = verificationToken;
      user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      await user.save();

      // Send verification email (implementation would be in a separate service)
      // await emailService.sendVerificationEmail(user.email, verificationToken);

      // Log user creation
      const AuditLog = mongoose.model("AuditLog");
      await AuditLog.logAction(
        user._id,
        "user_created",
        {
          username: user.username,
          email: user.email,
        },
        req
      );

      logger.info("New user registered", {
        userId: user._id,
        email: user.email,
      });

      res.status(201).json({
        success: true,
        message: "Registration successful. Please verify your email.",
      });
    } catch (error) {
      logger.error("Registration error", { error: error.message });
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
      }

      // Check login attempts
      const attempts = await incrementLoginAttempts(email);
      if (attempts > 5) {
        logger.warn("Too many login attempts", { email });
        throw new ApiError(429, "Too many login attempts. Try again later.");
      }

      // Find user
      const user = await User.findOne({ email }).select(
        "+password +accountLockedUntil"
      );

      if (!user) {
        throw new ApiError(401, "Invalid credentials");
      }

      // Check if account is locked
      if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        logger.warn("Login attempt on locked account", { userId: user._id });
        throw new ApiError(403, "Account is locked. Try again later.");
      }

      // Verify password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        // Log failed login attempt
        const AuditLog = mongoose.model("AuditLog");
        await AuditLog.logAction(
          user._id,
          "login_failed",
          {
            reason: "incorrect_password",
          },
          req
        );

        logger.warn("Failed login attempt - incorrect password", {
          userId: user._id,
        });
        throw new ApiError(401, "Invalid credentials");
      }

      // Clear login attempts on successful login
      await clearLoginAttempts(email);

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        return res.status(200).json({
          success: true,
          requiresTwoFactor: true,
          userId: user._id,
        });
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user._id, user.role);

      // Log successful login
      const AuditLog = mongoose.model("AuditLog");
      await AuditLog.logAction(
        user._id,
        "login_success",
        {
          twoFactorUsed: false,
        },
        req
      );

      logger.info("User logged in", { userId: user._id });

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
      logger.error("Login error", {
        email: req.body?.email,
        error: error.message,
      });
      next(error);
    }
  }

  static async getProfile(req, res, next) {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId).select(
        "-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken -emailVerificationExpires -twoFactorSecret"
      );

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      res.status(200).json({
        success: true,
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          preferences: user.preferences,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      logger.error("Get profile error", {
        userId: req.user?.id,
        error: error.message,
      });
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      const { jti } = req.user;

      // Remove from whitelist and add to blacklist
      await removeFromWhitelist(jti, req.user.id);
      await blacklistJwt(jti, parseInt(process.env.JWT_EXPIRES_IN) || 3600);

      // Log logout event
      const AuditLog = mongoose.model("AuditLog");
      await AuditLog.logAction(req.user.id, "logout", {}, req);

      logger.info("User logged out", { userId: req.user.id });

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      logger.error("Logout error", {
        userId: req.user?.id,
        error: error.message,
      });
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const { username, email } = req.body;
      const userId = req.user.id;

      // Validate input
      if (!username && !email) {
        throw new ApiError(400, "At least one field must be provided");
      }

      // Build update object
      const updateData = {};
      if (username) updateData.username = username;
      if (email) updateData.email = email;

      // Update user
      const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      });

      if (!updatedUser) {
        throw new ApiError(404, "User not found");
      }

      logger.info("User profile updated", { userId });

      res.status(200).json({
        success: true,
        data: {
          username: updatedUser.username,
          email: updatedUser.email,
        },
      });
    } catch (error) {
      logger.error("Profile update error", {
        userId: req.user?.id,
        error: error.message,
      });
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Validate input
      if (!currentPassword || !newPassword) {
        throw new ApiError(
          400,
          "Current password and new password are required"
        );
      }

      // Get user with password
      const user = await User.findById(userId).select("+password");
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        logger.warn(
          "Failed password change attempt - incorrect current password",
          { userId }
        );
        throw new ApiError(401, "Current password is incorrect");
      }

      // Check if new password is the same as current
      if (await user.comparePassword(newPassword)) {
        throw new ApiError(
          400,
          "New password must be different from current password"
        );
      }

      // Check if password has been used before
      if (await user.isPasswordReused(newPassword)) {
        throw new ApiError(
          400,
          "Password has been used previously. Please choose a different password."
        );
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Log the password change
      const AuditLog = mongoose.model("AuditLog");
      await AuditLog.logAction(userId, "password_changed", {}, req);

      // Generate new tokens
      const { accessToken, refreshToken } = generateTokens(user._id, user.role);

      logger.info("User password changed", { userId });

      res.status(200).json({
        success: true,
        message: "Password updated successfully",
        accessToken,
        refreshToken,
      });
    } catch (error) {
      logger.error("Password change error", {
        userId: req.user?.id,
        error: error.message,
      });
      next(error);
    }
  }

  static async getUserPreferences(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId).select("preferences");

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      res.status(200).json({
        success: true,
        data: user.preferences || {},
      });
    } catch (error) {
      logger.error("Get preferences error", {
        userId: req.user?.id,
        error: error.message,
      });
      next(error);
    }
  }

  static async updateUserPreferences(req, res, next) {
    try {
      const userId = req.user.id;
      const { preferences } = req.body;

      if (!preferences || typeof preferences !== "object") {
        throw new ApiError(400, "Valid preferences object is required");
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { preferences },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        throw new ApiError(404, "User not found");
      }

      logger.info("User preferences updated", { userId });

      res.status(200).json({
        success: true,
        data: updatedUser.preferences,
      });
    } catch (error) {
      logger.error("Update preferences error", {
        userId: req.user?.id,
        error: error.message,
      });
      next(error);
    }
  }
}

export default UserController;
