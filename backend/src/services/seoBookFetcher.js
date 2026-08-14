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
    const books = await searchGoogleBooks(searchParamsForEntry(entry, type));
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
