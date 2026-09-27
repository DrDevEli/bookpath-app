/**
 * Warm / refresh the SEO landing-page book cache.
 *
 * Walks the whole catalog and pre-populates Redis (`seo:v2:{type}:{slug}`) so that
 * crawler traffic never triggers a cold Google Books fetch (slow + quota burn).
 * Run on a schedule (crontab / GitHub Action) — see scripts/README.md.
 *
 * Usage (from backend/):
 *   node scripts/refreshSeoCache.js                 # all pages, honours the cache
 *   node scripts/refreshSeoCache.js --force         # all pages, re-fetch + REWRITE each
 *   node scripts/refreshSeoCache.js --cold-only     # only cold/stale pages, re-fetched
 *                                                   # (implies --force — a stale entry must
 *                                                   #  be rewritten, not merely re-armed)
 *   node scripts/refreshSeoCache.js --audit-only    # READ-ONLY: report cache health, no fetches
 *   node scripts/refreshSeoCache.js --genre         # genres only
 *   node scripts/refreshSeoCache.js --topic --limit=10
 *
 * The cron entry uses --force: without it a page is served from cache and reported
 * as "populated" without being rewritten, so the entry keeps its old expiry and can
 * go cold later the same day while the log stays green (that is exactly how the
 * 2026-09-26 incident hid for a week). --force makes the daily warm a real write.
 *
 * SELF-CHECK (R5): after walking the catalog the script audits Redis for every page
 * in scope and asserts each holds a FRESHLY WRITTEN payload, not merely an existing
 * key. A short count prints the offending slugs and exits non-zero, so cron email /
 * log monitoring sees it. The old "N populated, 0 empty" line is a fetch counter and
 * was never evidence that the cache was warm — trust the audit line, not that one.
 * `--audit-only` exposes the same check as a zero-quota health probe: there, a key
 * written by an earlier run is healthy and only MISSING keys fail.
 *
 * Env: SEO_REFRESH_CONCURRENCY (default 3) to tune parallelism.
 *      SEO_REFRESH_INTERVAL_MS (default 1100) — minimum gap between Google
 *      Books requests. Google allows ~100 requests / 100 seconds per user, so
 *      firing all 154 pages at once 429s near the end and leaves those landing
 *      pages empty. The gap is what makes the warm actually complete. It is now
 *      enforced INSIDE seoBookFetcher.paceRequests() (shared across concurrent
 *      workers) rather than here, because one page can cost up to 3 requests —
 *      a per-page gate could no longer bound the real request rate.
 */
import "./loadEnv.js"; // MUST be first — loads backend/.env before other modules read process.env

import { GENRES, TOPICS, AUTHORS } from "../src/data/seoCatalog.js";
import { fetchBooksForEntry, cacheKeyForEntry, CACHE_TTL } from "../src/services/seoBookFetcher.js";
import redis from "../src/config/redis.js";

const CONCURRENCY = Number(process.env.SEO_REFRESH_CONCURRENCY || 3);

// How close to a full TTL a key must be to count as "written by this run". The run
// itself takes ~170s (up to ~12 min when Google is throttling), so 20 min of slack
// is well inside it while still being far shorter than the hours that separate one
// daily run from the next — which is the difference we are detecting.
const FRESH_WINDOW_SECONDS = 20 * 60;

// Shared request gate now lives in seoBookFetcher.paceRequests() — see the header.

function buildList(filterType) {
  const list = [];
  if (!filterType || filterType === "genre") GENRES.forEach((e) => list.push({ entry: e, type: "genre" }));
  if (!filterType || filterType === "topic") TOPICS.forEach((e) => list.push({ entry: e, type: "topic" }));
  if (!filterType || filterType === "author") AUTHORS.forEach((e) => list.push({ entry: e, type: "author" }));
  return list;
}

function parseArgs(argv) {
  let filterType = null;
  let limit = Infinity;
  let force = false;
  let coldOnly = false;
  let auditOnly = false;
  for (const a of argv) {
    if (a === "--genre") filterType = "genre";
    else if (a === "--topic") filterType = "topic";
    else if (a === "--author") filterType = "author";
    else if (a === "--force") force = true;
    else if (a === "--cold-only") coldOnly = true;
    else if (a === "--audit-only") auditOnly = true;
    else if (a.startsWith("--limit=")) limit = Number(a.split("=")[1]);
  }
  return { filterType, limit, force, coldOnly, auditOnly };
}

/**
 * Read EXISTS + TTL for every page in scope in one round trip. "Fresh" means the
 * remaining TTL is within FRESH_WINDOW_SECONDS of a full TTL, i.e. this run (or a
 * read moments ago) wrote it — not that a key merely happens to exist.
 */
async function cacheStatus(items) {
  const pipe = redis.pipeline();
  for (const { entry, type } of items) {
    const key = cacheKeyForEntry(entry, type);
    pipe.exists(key);
    pipe.ttl(key);
  }
  const res = await pipe.exec();

  return items.map(({ entry, type }, i) => {
    const exists = Number(res[i * 2]?.[1] || 0);
    const ttl = Number(res[i * 2 + 1]?.[1] ?? -2);
    const status = !exists ? "cold" : ttl > 0 && ttl > CACHE_TTL - FRESH_WINDOW_SECONDS ? "fresh" : "stale";
    return { label: `${type}/${entry.slug}`, status, ttl };
  });
}

/** Print the authoritative cache verdict and set the exit code.
 *
 * `requireFresh` is true when called at the end of a refresh walk — then every page
 * in scope must hold a payload THIS run wrote. It is false for the standalone
 * `--audit-only` probe, where a key written by yesterday's warm is perfectly healthy:
 * only MISSING keys are a failure there, and the write ages are reported instead.
 */
function reportAudit(audit, { requireFresh = true } = {}) {
  const fresh = audit.filter((s) => s.status === "fresh");
  const stale = audit.filter((s) => s.status === "stale");
  const cold = audit.filter((s) => s.status === "cold");
  console.log(
    `Cache audit: ${fresh.length} fresh, ${stale.length} stale, ${cold.length} cold of ${audit.length} catalog pages.`
  );

  const ages = audit.filter((s) => s.ttl > 0).map((s) => CACHE_TTL - s.ttl);
  if (ages.length) {
    const h = (sec) => (sec / 3600).toFixed(1);
    console.log(
      `Write ages: newest ${h(Math.min(...ages))}h, oldest ${h(Math.max(...ages))}h ago (full TTL is ${CACHE_TTL / 3600}h).`
    );
  }

  const bad = requireFresh ? [...cold, ...stale] : cold;
  if (bad.length) {
    console.error(
      `FAIL: ${bad.length} of ${audit.length} pages do not hold ${requireFresh ? "a freshly written" : "any"} payload:\n` +
        bad
          .map((s) => `  ${s.status.padEnd(5)} ${s.label}${s.ttl >= 0 ? ` (ttl=${s.ttl}s)` : ""}`)
          .join("\n")
    );
    console.error(
      "If these are all 429/quota errors, the run fired outside the Google Books daily" +
        " quota window (reset 00:00 PT = 07:00 UTC in PDT / 08:00 UTC in PST)."
    );
    process.exitCode = 1;
  } else if (!requireFresh && stale.length) {
    console.log(
      `OK: 0 cold. ${stale.length} pages hold a payload from an earlier run — normal between daily warms.`
    );
  } else {
    console.log(
      `OK: all ${audit.length} pages in scope hold a fresh payload ` +
        `(${requireFresh ? "written by this run" : "written or TTL re-armed"}).`
    );
  }
  return { fresh, stale, cold };
}

async function main() {
  const { filterType, limit, force, coldOnly, auditOnly } = parseArgs(process.argv.slice(2));
  let items = buildList(filterType).slice(0, limit);
  const total = items.length;

  if (auditOnly) {
    console.log(`Read-only cache audit of ${total} catalog pages (no Google Books requests).`);
    reportAudit(await cacheStatus(items), { requireFresh: false });
    return;
  }

  if (coldOnly) {
    const before = await cacheStatus(items);
    const wanted = new Set(before.filter((s) => s.status !== "fresh").map((s) => s.label));
    items = items.filter(({ entry, type }) => wanted.has(`${type}/${entry.slug}`));
    console.log(
      `--cold-only: ${items.length} of ${total} pages are cold/stale — refreshing just those.`
    );
    if (items.length === 0) {
      reportAudit(before);
      return;
    }
  }

  const scope = items.length;
  // A page that is "stale" (payload present but old) must be REWRITTEN, not merely
  // re-armed — so selecting by freshness implies a real re-fetch.
  const refetchAll = force || coldOnly;
  let cursor = 0;
  let populated = 0;
  let empty = 0;
  let refetched = 0;
  const emptySlugs = [];
  const start = Date.now();

  const worker = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      const { entry, type } = items[i];
      const books = await fetchBooksForEntry(entry, type, { force: refetchAll });
      if (refetchAll) refetched++;
      if (books.length > 0) populated++;
      else { empty++; emptySlugs.push(`${type}/${entry.slug}`); }
      const done = populated + empty;
      process.stdout.write(
        `\r[${done}/${scope}] ${type}/${entry.slug} -> ${books.length} books`
      );
    }
  };

  const pool = Array.from({ length: Math.min(CONCURRENCY, scope) }, worker);
  await Promise.all(pool);

  const secs = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `\n\nDone in ${secs}s: ${populated} populated, ${empty} empty (of ${scope} pages) ` +
      `[refetch=${refetched} mode=${refetchAll ? "force" : "cache"}].`
  );
  if (emptySlugs.length) {
    console.log(`Empty pages (Google Books returned nothing): ${emptySlugs.join(", ")}`);
  }
  if (!refetchAll) {
    console.log(
      "NOTE: cache mode — hits were returned with their TTL re-armed, so 'fresh' below means " +
        "'guaranteed for another 72h', NOT 'content re-fetched'. Use --force for a real content refresh."
    );
  }

  // --- R5: the authoritative check. Verify the ARTIFACT (a freshly written,
  // --- non-empty payload per page), not the counter printed above.
  reportAudit(await cacheStatus(items));

  if (populated === 0 && scope > 0) {
    console.error("WARN: every page came back empty — check GOOGLE_BOOKS_API_KEY / quota.");
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error("Refresh failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => {
    try { redis.disconnect(); } catch {}
    process.exit(process.exitCode ?? 0);
  });
