import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import * as openpgp from "openpgp";
import AuditLog from "./AuditLog.js";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
    minlength: 12,
    validate: {
      validator: function (v) {
        // Check for at least one uppercase, one lowercase, one number, one special char, and min length 12
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/.test(
          v
        );
      },
      message:
        "Password must be at least 12 characters and contain uppercase, lowercase, numbers and special characters",
    },
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  passwordHistory: [
    {
      hash: String,
      changedAt: Date,
    },
  ],
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  accountLockedUntil: Date,
  passwordResetToken: String,
  resetTokenExpires: Date,
  gpgPublicKey: {
    type: String,
    trim: true,
    select: false,
    validate: {
      validator: async function (v) {
        try {
          await openpgp.readKey({ armoredKey: v });
          return true;
        } catch {
          return false;
        }
      },
      message: "Invalid GPG public key format",
    },
  },
  keyFingerprint: {
    type: String,
    unique: true,
    sparse: true,
    match: /^[0-9A-F]{40}$/,
    index: true,
  },
  subscriptionTier: {
    type: String,
    enum: ["free", "pro"],
    default: "free",
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  tokenVersion: { type: Number, default: 0 },

  preferences: {
    type: Object,
    default: {
      theme: "light",
      booksPerPage: 10,
      defaultSearchType: "title",
    },
  },

  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: {
    type: String,
    select: false,
  },
  // SHA-256 hashes of one-time recovery codes. High-entropy random codes are
  // hashed so a DB read can't be used to log in; plaintext is shown to the
  // user exactly once at setup (audit C2).
  recoveryCodes: {
    type: [String],
    select: false,
    default: undefined,
  },

  oauth: {
    google: String,
    github: String,
  },
}, { timestamps: true });

// Indexes are already defined in the schema with unique: true

// Audit logging middleware
userSchema.post("save", function (doc) {
  AuditLog.create({
    userId: doc._id,
    action: "user_modified",
    metadata: {
      changedFields: Object.keys(doc.modifiedPaths()),
    },
  });
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    if (this.password) {
      // Hash the NEW password FIRST. Never store or push plaintext anywhere.
      const hashed = await bcrypt.hash(this.password, 12);

      // Rolling history of the last 5 password HASHES for reuse detection.
      // SECURITY: only bcrypt hashes are stored here — plaintext passwords
      // must never reach the database (see audit C1).
      if (!this.passwordHistory) {
        this.passwordHistory = [];
      }
      if (this.passwordHistory.length >= 5) {
        this.passwordHistory.shift();
      }
      this.passwordHistory.push({ hash: hashed, changedAt: new Date() });

      this.password = hashed;

      // Epoch revocation timestamp. Any JWT that was issued before "now"
      // embeds an older tokenVersion and is rejected by authMiddleware
      // (user.tokenVersion > verified.tokenVersion). Monotonic via +1 guard
      // against same-millisecond revocations.
      this.tokenVersion = Math.max(Date.now(), (this.tokenVersion || 0) + 1);
    }
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if password has been used before
userSchema.methods.isPasswordReused = async function (newPassword) {
  if (!this.passwordHistory || this.passwordHistory.length === 0) {
    return false;
  }

  // Check against password history
  for (const historyItem of this.passwordHistory) {
    if (await bcrypt.compare(newPassword, historyItem.hash)) {
      return true;
    }
  }

  return false;
};

const User = mongoose.model("User", userSchema);

export default User;
