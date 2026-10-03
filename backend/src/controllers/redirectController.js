import { verifyTracked, resolveChannel, marketForDestination } from "../services/trackedLink.js";
import analyticsService from "../services/analyticsService.js";
import { isBotRequest } from "../utils/botDetect.js";
import logger from "../config/logger.js";

/**
 * RedirectController — the single measured exit point to the retailer.
 *
 * Every outbound affiliate link in server-rendered HTML goes through here, so
 * "how many people left for Amazon, from which channel, from which list" is a
 * Mongo query rather than a guess.
 *
 * It is deliberately NOT auth-gated (a logged-out reader is the common case)
 * and deliberately does NOT call Google Books, so a click still converts on a
 * quota-exhausted day.
 */
class RedirectController {
  static trackAndRedirect(req, res) {
    const verified = verifyTracked(req.query);

    if (!verified.ok) {
      logger.warn("Tracked link rejected", {
        reason: verified.reason,
        ip: req.ip,
        path: req.originalUrl?.slice(0, 200),
      });
      // A tampered link is a client error, never a redirect.
      return res
        .status(400)
        .type("text/plain")
        .send("This link is invalid or was modified. Please use bookpath.org to find the book.");
    }

    const source = resolveChannel({
      explicit: verified.source,
      cookieSource: req.cookies?.bp_src,
      referrer: req.get("referer"),
    });

    // This endpoint is a real href in server-rendered pages, so link-following crawlers
    // hit it exactly like a reader. Classify the UA and MARK the row rather than
    // counting it as a reader — the redirect itself still happens either way, because
    // the funnel must never break for a real user.
    const bot = isBotRequest(req);

    analyticsService.recordClick({
      source,
      context: verified.context || null,
      bookId: verified.bookId || null,
      bookTitle: verified.bookTitle || null,
      authors: verified.authors ? verified.authors.split("; ") : [],
      coverImage: verified.coverImage || null,
      amazonUrl: verified.url,
      market: marketForDestination(verified.url),
      userId: req.user?.id || null,
      isBot: bot.isBot,
      req,
    });

    logger.info("Tracked outbound click", {
      source,
      context: verified.context || null,
      bookId: verified.bookId || null,
      market: marketForDestination(verified.url),
      isBot: bot.isBot,
      botReason: bot.reason,
    });

    // The redirect itself must never be cached or indexed.
    res.set("Cache-Control", "no-store");
    res.set("X-Robots-Tag", "noindex");
    return res.redirect(302, verified.url);
  }
}

export default RedirectController;
