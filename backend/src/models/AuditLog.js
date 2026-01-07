import mongoose from "mongoose";
import logger from "../config/logger.js";

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "user_created",
        "user_modified",
        "user_deleted",
        "login_success",
        "login_failed",
        "logout",
        "password_changed",
        "password_reset_requested",
        "password_reset_completed",
        "email_verified",
        "two_factor_enabled",
        "two_factor_disabled",
        "collection_created",
        "collection_modified",
        "collection_deleted",
        "book_added_to_collection",
        "book_removed_from_collection",
      ],
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    metadata: {
      type: Object,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
auditLogSchema.index({ userId: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

// Static method to log actions
auditLogSchema.statics.logAction = async function (
  userId,
  action,
  metadata = {},
  req = null
) {
  try {
    const logEntry = {
      userId,
      action,
      metadata,
    };

    // Add request info if available
    if (req) {
      logEntry.ipAddress = req.ip;
      logEntry.userAgent = req.headers["user-agent"];
    }

    await this.create(logEntry);
    logger.debug("Audit log created", { userId, action });
  } catch (error) {
    logger.error("Failed to create audit log", {
      error: error.message,
      userId,
      action,
    });
  }
};

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
