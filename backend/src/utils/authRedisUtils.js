import redis from "../config/redis.js";
import User from "../models/User.js";
import logger from "../config/logger.js";

// L1 (Sep 9): failed-login throttling redesigned so an attacker CANNOT lock a
// victim's account by rotating IPs. Rules:
//  - Count only REAL failures (wrong password on an existing account).
//  - Lock the account ONLY when failures come from <= MAX_LOCK_IPS distinct
//    IPs (same-source brute force). Distributed attempts (many IPs) never
//    lock the account — per-IP rate limiting handles those.
//  - Window is 15 minutes (rolling), not "per calendar day" (a day-window
//    counter meant 5 failures at 00:01 could lock until 00:30 and the key
//    never reset until midnight — see audit L1).

const FAIL_WINDOW_SECONDS = 15 * 60; // 15 min rolling window
const ACCOUNT_LOCK_THRESHOLD = 5; // failures within window
const MAX_LOCK_IPS = 2; // distinct IPs allowed before we refuse to hard-lock
const ACCOUNT_LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// ipAddress may be undefined (non-web callers). Normalize to "unknown" so the
// distinct-IP math still works.
function normalizeIp(ip) {
  return typeof ip === "string" && ip.trim() ? ip.trim() : "unknown";
}

/**
 * Record a failed login for an identifier (email or username).
 * Returns { locked: boolean, attempts, distinctIps, lockUntil } — the caller
 * decides the HTTP status (423/429) from `locked`.
 */
export async function recordFailedLogin(identifier, ipAddress) {
  const normalizedId =
    typeof identifier === "string" ? identifier.trim().toLowerCase() : null;
  if (!normalizedId) return { locked: false, attempts: 0, distinctIps: 0 };

  const ip = normalizeIp(ipAddress);
  try {
    const countKey = `login:fail:${normalizedId}`;
    const ipsKey = `login:failips:${normalizedId}`;

    const attempts = await redis.incr(countKey);
    await redis.expire(countKey, FAIL_WINDOW_SECONDS);
    await redis.sadd(ipsKey, ip);
    await redis.expire(ipsKey, FAIL_WINDOW_SECONDS);
    const distinctIps = await redis.scard(ipsKey);

    // Same-source brute force → hard-lock the account. If failures spread
    // across many IPs, that is a distributed attack or a lockout-DoS attempt:
    // do NOT hard-lock; the per-IP rate limiter is the correct control.
    if (attempts >= ACCOUNT_LOCK_THRESHOLD && distinctIps <= MAX_LOCK_IPS) {
      const lockUntil = new Date(Date.now() + ACCOUNT_LOCK_DURATION_MS);
      await User.updateOne(
        { email: normalizedId },
        { accountLockedUntil: lockUntil }
      );
      logger.warn("Account locked after repeated failed logins (same source)", {
        identifier: normalizedId,
        attempts,
        distinctIps,
        lockUntil: lockUntil.toISOString(),
      });
      return { locked: true, attempts, distinctIps, lockUntil };
    }

    return { locked: false, attempts, distinctIps };
  } catch (error) {
    logger.error("Error recording failed login", {
      identifier: normalizedId,
      error: error.message,
    });
    return { locked: false, attempts: 0, distinctIps: 0 }; // fail open
  }
}

/**
 * Clear failed-login state after a successful authentication.
 */
export async function clearFailedLogins(identifier) {
  const normalizedId =
    typeof identifier === "string" ? identifier.trim().toLowerCase() : null;
  if (!normalizedId) return;
  try {
    await redis.del(`login:fail:${normalizedId}`);
    await redis.del(`login:failips:${normalizedId}`);
  } catch (error) {
    logger.error("Error clearing failed logins", {
      identifier: normalizedId,
      error: error.message,
    });
  }
}

// ---- Back-compat wrappers (older callers) --------------------------------

/**
 * @deprecated Use recordFailedLogin(identifier, ipAddress) — the old daily
 * counter let ANY IP lock a known account (lockout DoS, audit L1).
 */
export async function incrementLoginAttempts(identifier, ipAddress) {
  const r = await recordFailedLogin(identifier, ipAddress);
  return r.locked ? ACCOUNT_LOCK_THRESHOLD + 1 : r.attempts;
}

/**
 * @deprecated Use clearFailedLogins(identifier).
 */
export async function clearLoginAttempts(identifier) {
  return clearFailedLogins(identifier);
}

/**
 * Lock the user account for a defined duration. (Retained for explicit
 * admin/other flows.)
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
