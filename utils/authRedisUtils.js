import redis from './redis.js'; // Your Redis connection pool instance

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_TTL_SECONDS = 86400; // 1 day
const ACCOUNT_LOCK_DURATION_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Increment login attempts for the given email.
 * Returns the new attempt count.
 */
export async function incrementLoginAttempts(email) {
  const key = `login:${email}:${new Date().toISOString().slice(0, 10)}`;
  const attempts = await redis.incr(key);
  await redis.expire(key, LOGIN_ATTEMPT_TTL_SECONDS);
  return attempts;
}

/**
 * Clear login attempts for the given email.
 */
export async function clearLoginAttempts(email) {
  const key = `login:${email}:${new Date().toISOString().slice(0, 10)}`;
  await redis.del(key);
}

/**
 * Lock the user account for a defined duration.
 */
export async function lockUserAccount(userId) {
  const lockUntil = new Date(Date.now() + ACCOUNT_LOCK_DURATION_MS);
  await User.findByIdAndUpdate(userId, { accountLockedUntil: lockUntil });
  return lockUntil;
}

/**
 * Check if the given JWT ID (jti) is blacklisted.
 */
export async function isJwtBlacklisted(jti) {
  const result = await redis.get(`jwt:blacklist:${jti}`);
  return Boolean(result);
}
