// Refresh-token cookie helpers (M3 — Sep 9).
// The refresh token is stored in an httpOnly, Secure, SameSite=Strict cookie
// instead of localStorage. An XSS can no longer exfiltrate the long-lived
// refresh credential; only the short-lived access token lives in JS memory /
// localStorage. Same-origin /api calls send the cookie automatically.
import logger from "../config/logger.js";

export const REFRESH_COOKIE_NAME = "bp_refresh";

// 7 days — keep in sync with JWT_REFRESH_EXPIRES_IN default in jwtUtils.
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function setRefreshCookie(res, refreshToken) {
  try {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });
  } catch (error) {
    logger.error("Failed to set refresh cookie", { error: error.message });
  }
}

export function clearRefreshCookie(res) {
  try {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
  } catch (error) {
    logger.error("Failed to clear refresh cookie", { error: error.message });
  }
}
