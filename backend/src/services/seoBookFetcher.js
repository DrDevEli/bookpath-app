import { searchGoogleBooks } from "./googleBooksService.js";
import redis from "../config/redis.js";
import logger from "../config/logger.js";

/**
 * Shared SEO book fetcher — used by both the HTTP controller and the
 * cache-warming refresh script so they write to the SAME cache keys.
 *
 * Two invariants this file exists to protect (learned the hard way, 2026-09-26):
 *
 *   1. NEVER cache an empty payload. A stored `[]` is a truthy string to
 *      `redis.get`, so an upstream hiccup would be served as a "cache hit" with
 *      zero books for the whole TTL — a thin landing page pinned in Redis with
 *      nothing logged anywhere.
 *
 *   2. A refresh must actually REWRITE the entry, or at least re-arm its TTL.
 *      The old early-return-on-hit meant a run reported "populated" for pages it
 *      never touched, so a page could be logged as a successful warm at 08:32
 *      and be serving zero books by the afternoon. `force` is how the daily warm
 *      guarantees a write; the sliding TTL on an ordinary read is how normal
 *      crawler traffic keeps an entry alive between runs.
 */

export const CACHE_TTL = 72 * 60 * 60; // 72h — must outlive the daily SEO refresh (08:30 UTC)
// by a wide margin. At 24h the cache expired at almost exactly the moment the next
// refresh ran, so a single late or quota-blocked refresh left every uncached landing
// page serving ZERO books (observed 2026-09-26: 31 warm / 123 cold of 154). With 72h a
// failed refresh degrades freshness only, never availability.
const MAX_BOOKS = 12;

// Stale-while-revalidate: when an upstream fetch fails, keep the last good payload
// alive for at least this long (we never SHORTEN an existing TTL). Stale content
// beats a blank page for a crawler, and the refresh self-check still reports it as
// not-fresh so the staleness is visible instead of silent.
const STALE_GRACE_SECONDS = 6 * 60 * 60;

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
  // v2: the cache now stores RAW Google Books results (no affiliate links), so
  // the storefront can be resolved per request at render time. The version bump
  // retires the old enriched entries instead of serving stale `.de` links to
  // visitors who belong on amazon.com.
  return `seo:v2:${type}:${entry.slug}`;
}

/**
 * Fetch (or return cached) books for a landing page. Upstream failures are
 * swallowed and return [] so one bad entry never kills a batch job or a page.
 * Affiliate links are NOT cached — the HTTP controller adds them per request.
 *
 * @param {object}  entry
 * @param {string}  type              "genre" | "topic" | "author"
 * @param {object}  [options]
 * @param {boolean} [options.force]   skip the cache read entirely and re-fetch, so
 *                                    the entry is genuinely rewritten (daily warm).
 */
export async function fetchBooksForEntry(entry, type, options = {}) {
  const { force = false } = options;
  const cacheKey = cacheKeyForEntry(entry, type);

  if (!force) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const books = JSON.parse(cached);
        if (Array.isArray(books) && books.length > 0) {
          // Sliding TTL: a read that proves the entry is alive also re-arms it, so
          // an entry can only go cold when nothing at all touches it. One EXPIRE,
          // no Google quota. Best-effort: a failure here must not fail the page.
          redis.expire(cacheKey, CACHE_TTL).catch(() => {});
          logger.debug("SEO book cache hit", { type, slug: entry.slug, count: books.length });
          return books;
        }
        // Legacy empty payload (written before we stopped caching them) — treat as a
        // miss so the page gets a real attempt instead of a cached blank.
        logger.debug("SEO book cache held an empty payload — revalidating", {
          type,
          slug: entry.slug,
        });
      }
    } catch (err) {
      logger.warn("SEO cache read failed", { type, slug: entry.slug, error: err.message });
    }
  }

  try {
    const books = await searchWithBackoff(
      searchParamsForEntry(entry, type),
      `${type}/${entry.slug}`
    );
    const trimmed = (books || []).slice(0, MAX_BOOKS);

    if (trimmed.length === 0) {
      // Never cache emptiness — see invariant 1. Leave any existing entry as-is.
      logger.warn("SEO book fetch returned nothing — cache left untouched", {
        type,
        slug: entry.slug,
      });
      return [];
    }

    try {
      await redis.set(cacheKey, JSON.stringify(trimmed), "EX", CACHE_TTL);
    } catch (err) {
      logger.warn("SEO cache write failed", { type, slug: entry.slug, error: err.message });
    }
    return trimmed;
  } catch (err) {
    logger.error("SEO book fetch failed", { type, slug: entry.slug, error: err.message });

    // Stale-while-revalidate: rather than letting a failing page expire into a
    // blank, extend the last good payload to the grace window. Never shortens.
    try {
      const exists = await redis.exists(cacheKey);
      if (exists) {
        const ttl = await redis.ttl(cacheKey);
        if (ttl >= 0 && ttl < STALE_GRACE_SECONDS) {
          await redis.expire(cacheKey, STALE_GRACE_SECONDS);
        }
        logger.warn("SEO book fetch failed — serving the stale cache entry", {
          type,
          slug: entry.slug,
          ttlSeconds: ttl,
        });
      }
    } catch {
      /* best effort */
    }
    return [];
  }
}
