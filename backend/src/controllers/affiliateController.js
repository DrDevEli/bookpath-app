import logger from "../config/logger.js";
import { ApiError } from "../utils/errors.js";

/**
 * Simple affiliate redirect controller
 * Logs the click and redirects to the allowed external URL
 * Prevents open redirects by validating the hostname
 */
export const redirect = async (req, res, next) => {
  try {
    const { url, source = "unknown", bookId = "" } = req.query;

    if (!url) {
      throw new ApiError(400, "Missing url parameter");
    }

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new ApiError(400, "Invalid url parameter");
    }

    // Allowlist check (avoid open redirect)
    const allowedDomains = new Set([
      process.env.AMAZON_DOMAIN || "amazon.com",
      `www.${process.env.AMAZON_DOMAIN || "amazon.com"}`,
    ]);

    if (!allowedDomains.has(parsed.hostname)) {
      throw new ApiError(400, "Destination host not allowed");
    }

    // Log the click (augment as needed with metrics/storage)
    logger.info("Affiliate click", {
      source,
      bookId,
      userId: req.user?.id,
      href: parsed.href,
      host: parsed.hostname,
      path: parsed.pathname,
    });

    // 302 redirect to affiliate URL
    res.redirect(302, parsed.href);
  } catch (err) {
    next(err);
  }
};

export default {
  redirect,
};



