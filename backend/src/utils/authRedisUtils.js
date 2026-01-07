import redis from "../config/redis.js";
import User from "../models/User.js";
import logger from "../config/logger.js";

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_TTL_SECONDS = 86400; // 1 day
const ACCOUNT_LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Increment login attempts for the given email.
 * Returns the new attempt count.
 */
export async function incrementLoginAttempts(email) {
  try {
    const key = `login:${email}:${new Date().toISOString().slice(0, 10)}`;
    const attempts = await redis.incr(key);
    await redis.expire(key, LOGIN_ATTEMPT_TTL_SECONDS);

    // If attempts exceed limit, lock the account
    if (attempts >= LOGIN_ATTEMPT_LIMIT) {
      const user = await User.findOne({ email });
      if (user) {
        await lockUserAccount(user._id);
        logger.warn("Account locked due to too many failed login attempts", {
          email,
        });
      }
    }

    return attempts;
  } catch (error) {
    logger.error("Error incrementing login attempts", {
      email,
      error: error.message,
    });
    return 0; // Return 0 to prevent blocking legitimate login attempts if Redis fails
  }
}

/**
 * Clear login attempts for the given email.
 */
export async function clearLoginAttempts(email) {
  try {
    const key = `login:${email}:${new Date().toISOString().slice(0, 10)}`;
    await redis.del(key);
    logger.info("Login attempts cleared", { email });
  } catch (error) {
    logger.error("Error clearing login attempts", {
      email,
      error: error.message,
    });
  }
}

/**
 * Lock the user account for a defined duration.
 */
export async function lockUserAccount(userId) {
  try {
    const lockUntil = new Date(Date.now() + ACCOUNT_LOCK_DURATION_MS);
    await User.findByIdAndUpdate(userId, { accountLockedUntil: lockUntil });
    logger.info("User account locked", { userId, lockUntil });
    return lockUntil;
  } catch (error) {
    logger.error("Error locking user account", {
      userId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Check if the given JWT ID (jti) is blacklisted.
 */
export async function isJwtBlacklisted(jti) {
  try {
    const result = await redis.get(`jwt:blacklist:${jti}`);
    return Boolean(result);
  } catch (error) {
    logger.error("Error checking JWT blacklist", { jti, error: error.message });
    return true; // Fail closed - if we can't check, assume token is invalid
  }
}

/**
 * Add a JWT to the whitelist
 */
export async function whitelistJwt(jti, userId, expiresIn = 3600) {
  try {
    await redis.set(`jwt:whitelist:${userId}:${jti}`, "1", "EX", expiresIn);
    logger.info("JWT whitelisted", { jti, userId });
    return true;
  } catch (error) {
    logger.error("Error whitelisting JWT", {
      jti,
      userId,
      error: error.message,
    });
    return false;
  }
}

/**
 * Check if JWT is whitelisted
 */
export async function isJwtWhitelisted(jti, userId) {
  try {
    const result = await redis.get(`jwt:whitelist:${userId}:${jti}`);
    return Boolean(result);
  } catch (error) {
    logger.error("Error checking JWT whitelist", {
      jti,
      userId,
      error: error.message,
    });
    return false; // Fail closed - if we can't check, assume token is invalid
  }
}

/**
 * Remove JWT from whitelist
 */
export async function removeFromWhitelist(jti, userId) {
  try {
    await redis.del(`jwt:whitelist:${userId}:${jti}`);
    logger.info("JWT removed from whitelist", { jti, userId });
    return true;
  } catch (error) {
    logger.error("Error removing JWT from whitelist", {
      jti,
      userId,
      error: error.message,
    });
    return false;
  }
}

/**
 * Add a JWT to the blacklist
 */
export async function blacklistJwt(jti, expiresIn = 3600) {
  try {
    await redis.set(`jwt:blacklist:${jti}`, "1", "EX", expiresIn);
    logger.info("JWT blacklisted", { jti });
    return true;
  } catch (error) {
    logger.error("Error blacklisting JWT", { jti, error: error.message });
    return false;
  }
}
