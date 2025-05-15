import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import * as openpgp from "openpgp";
import AuditLog from "./AuditLog.js";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    select: false,
    minlength: 12,
    validate: {
      validator: function (v) {
        return /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{12,}$/.test(v);
      },
      message: 'Password must contain uppercase, lowercase, numbers and special chars'
    }
  },
  passwordHistory: [{
    hash: String,
    changedAt: Date
  }],
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: Date,
  passwordResetToken: String,
  resetTokenExpires: Date,
  gpgPublicKey: {
    type: String,
    trim: true,
    select: false,
    encrypt: true, // Add encryption at rest
    validate: {
      validator: async function (v) {
        try {
          await openpgp.readKey({ armoredKey: v });
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid GPG public key format'
    }
  },
  keyFingerprint: {
    type: String,
    unique: true,
    match: /^[0-9A-F]{40}$/,
    index: true
  },
  subscriptionTier: { 
    type: String, 
    enum: ['free', 'pro'], 
    default: 'free' },
    tokenVersion: { type: Number, default: 0 },

});

// Audit logging middleware
userSchema.post('save', function (doc) {
  AuditLog.create({
    userId: doc._id,
    action: 'user_modified',
    metadata: {
      changedFields: Object.keys(doc.modifiedPaths())
    }
  });
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
    this.tokenVersion += 1; // Invalidate existing JWTs
  }
  next();
});


// Compare password method                                                                                                                
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
