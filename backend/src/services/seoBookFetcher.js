import { searchGoogleBooks } from "./googleBooksService.js";
import { rankBooks, selectionOptionsFor } from "./catalogRanker.js";
import redis from "../config/redis.js";
import logger from "../config/logger.js";

/**
 * Shared SEO book fetcher — used by both the HTTP controller and the
 * cache-warming refresh script so they write to the SAME cache keys.
 *
 * Invariants this file exists to protect:
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
 *
 *   3. NEVER serve the raw Google relevance order (2026-09-27). See
 *      catalogRanker.js for the audit. Two things happen here that did not
 *      before: the candidate pool is widened by paginating, and every candidate
 *      is scored/filtered on metadata already in the payload (zero extra quota).
 *      Google's own relevance order is what filled `topic/best-memoirs` with
 *      1881 geological surveys, so it is an input, never the output.
 *      Measured: `maxResults=40` is silently CAPPED AT 20 by the Books API, so a
 *      bigger pool needs `startIndex` pagination, not a bigger page size.
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

// How many Google pages (20 volumes each) to pull before ranking. The pool has to
// be wider than the number of cards we serve, because a page whose top 20 volumes
// are all 19th-century scans (`topic/best-memoirs`: 12 of 12 rejected) can only be
// filled from deeper in the result set. Measured: paginating returns disjoint
// batches (0 id overlap between pages 1/2/3), so each extra page is genuinely new
// candidates. The loop stops as soon as the ranker can fill the shelf.
const MAX_CANDIDATE_PAGES = 3;

// Minimum gap between Google Books requests, shared across concurrent callers.
// Google allows ~100 requests / 100 seconds per user, so a warm that fires all
// 154 pages at once 429s from ~request 150 onward and leaves those pages empty.
// This gate used to live in refreshSeoCache.js; it moved here because the
// fetch now may issue up to MAX_CANDIDATE_PAGES requests for a single page, and a
// per-page gate could no longer bound the real request rate.
const REQUEST_INTERVAL_MS = Number(process.env.SEO_REFRESH_INTERVAL_MS || 1100);
let nextRequestSlot = Date.now();

export async function paceRequests() {
  const now = Date.now();
  const wait = Math.max(0, nextRequestSlot - now);
  nextRequestSlot = Math.max(now, nextRequestSlot) + REQUEST_INTERVAL_MS;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

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

export function searchParamsForEntry(entry, type, page = 1) {
  if (type === "genre") return { subject: entry.query, page };
  if (type === "author") return { author: entry.query, page };
  return { q: entry.query, page };
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
    const selection = selectionOptionsFor(entry, type, MAX_BOOKS);
    const candidates = [];
    let ranked = { selected: [], stats: null };
    let requests = 0;

    // Widen the candidate pool until the ranker can fill a shelf (or we run out
    // of pages). Ranking runs over ALL candidates seen so far, so a good book on
    // page 3 outranks a mediocre one on page 1.
    for (let page = 1; page <= MAX_CANDIDATE_PAGES; page++) {
      await paceRequests();
      const batch = await searchWithBackoff(
        searchParamsForEntry(entry, type, page),
        `${type}/${entry.slug} p${page}`
      );
      requests++;
      if (!batch || batch.length === 0) break;
      candidates.push(...batch);
      ranked = rankBooks(candidates, selection);
      if (ranked.selected.length >= MAX_BOOKS) break;
    }

    const selected = ranked.selected;
    logger.info("SEO book selection", {
      type,
      slug: entry.slug,
      requests,
      candidates: candidates.length,
      served: selected.length,
      rejected: ranked.stats?.rejected,
    });

    if (selected.length === 0) {
      // Never cache emptiness — see invariant 1. Leave any existing entry as-is.
      logger.warn("SEO book fetch returned nothing usable — cache left untouched", {
        type,
        slug: entry.slug,
        considered: candidates.length,
        rejected: ranked.stats?.rejected,
      });
      return [];
    }

    try {
      await redis.set(cacheKey, JSON.stringify(selected), "EX", CACHE_TTL);
    } catch (err) {
      logger.warn("SEO cache write failed", { type, slug: entry.slug, error: err.message });
    }
    return selected;
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
