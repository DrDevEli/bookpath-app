import { searchGoogleBooks } from "./googleBooksService.js";
import amazonAffiliateService from "./amazonAffiliateService.js";
import redis from "../config/redis.js";
import logger from "../config/logger.js";

/**
 * Shared SEO book fetcher — used by both the HTTP controller and the
 * cache-warming refresh script so they write to the SAME cache keys.
 */

const CACHE_TTL = 24 * 60 * 60; // 24h
const MAX_BOOKS = 12;

// Google Books enforces roughly 100 requests / 100 seconds per user on top of
// the daily 1,000-request quota. A catalog-wide warm (154 pages) fired in one
// burst therefore 429s from ~request 150 onward — which silently left the SEO
// landing pages with NO books (thin content for crawlers). Back off and retry
// instead of dropping the page.
const RETRY_DELAYS_MS = [1500, 4000, 10000];

function isRateLimited(err) {
  return err?.statusCode === 429 || /rate limit|quota|429/i.test(err?.message || "");
}

async function searchWithBackoff(params, label) {
  let lastErr;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await searchGoogleBooks(params);
    } catch (err) {
      lastErr = err;
      if (!isRateLimited(err) || attempt === RETRY_DELAYS_MS.length) throw err;
      const wait = RETRY_DELAYS_MS[attempt];
      logger.warn("Google Books rate limited — backing off", {
        label,
        attempt: attempt + 1,
        waitMs: wait,
        error: err.message,
      });
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

export function searchParamsForEntry(entry, type) {
  if (type === "genre") return { subject: entry.query, page: 1 };
  if (type === "author") return { author: entry.query, page: 1 };
  return { q: entry.query, page: 1 };
}

export function cacheKeyForEntry(entry, type) {
  return `seo:${type}:${entry.slug}`;
}

/**
 * Fetch (or return cached) books for a landing page. Upstream failures are
 * swallowed and return [] so one bad entry never kills a batch job or a page.
 */
export async function fetchBooksForEntry(entry, type) {
  const cacheKey = cacheKeyForEntry(entry, type);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const books = JSON.parse(cached);
      logger.debug("SEO book cache hit", { type, slug: entry.slug, count: books.length });
      return books;
    }
  } catch (err) {
    logger.warn("SEO cache read failed", { type, slug: entry.slug, error: err.message });
  }

  try {
    const books = await searchWithBackoff(
      searchParamsForEntry(entry, type),
      `${type}/${entry.slug}`
    );
    const trimmed = (books || []).slice(0, MAX_BOOKS);
    const enriched = await amazonAffiliateService.addAffiliateLinksToBooks(trimmed);

    try {
      await redis.set(cacheKey, JSON.stringify(enriched), "EX", CACHE_TTL);
    } catch (err) {
      logger.warn("SEO cache write failed", { type, slug: entry.slug, error: err.message });
    }
    return enriched;
  } catch (err) {
    logger.error("SEO book fetch failed", { type, slug: entry.slug, error: err.message });
    return [];
  }
}
