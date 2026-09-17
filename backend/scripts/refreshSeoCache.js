/**
 * Warm / refresh the SEO landing-page book cache.
 *
 * Walks the whole catalog and pre-populates Redis (`seo:{type}:{slug}`) so that
 * crawler traffic never triggers a cold Google Books fetch (slow + quota burn).
 * Run on a schedule (crontab / GitHub Action) — see scripts/README.md.
 *
 * Usage (from backend/):
 *   node scripts/refreshSeoCache.js                 # all pages
 *   node scripts/refreshSeoCache.js --genre         # genres only
 *   node scripts/refreshSeoCache.js --topic --limit=10
 *
 * Env: SEO_REFRESH_CONCURRENCY (default 3) to tune parallelism.
 *      SEO_REFRESH_INTERVAL_MS (default 1100) — minimum gap between Google
 *      Books requests. Google allows ~100 requests / 100 seconds per user, so
 *      firing all 154 pages at once 429s near the end and leaves those landing
 *      pages empty. The gap is what makes the warm actually complete.
 */
import "./loadEnv.js"; // MUST be first — loads backend/.env before other modules read process.env

import { GENRES, TOPICS, AUTHORS } from "../src/data/seoCatalog.js";
import { fetchBooksForEntry } from "../src/services/seoBookFetcher.js";
import redis from "../src/config/redis.js";

const CONCURRENCY = Number(process.env.SEO_REFRESH_CONCURRENCY || 3);
const INTERVAL_MS = Number(process.env.SEO_REFRESH_INTERVAL_MS || 1100);

// Shared request gate: guarantees a minimum gap between Google Books calls even
// though several workers run concurrently.
let nextSlot = Date.now();
async function pace() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + INTERVAL_MS;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

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
  for (const a of argv) {
    if (a === "--genre") filterType = "genre";
    else if (a === "--topic") filterType = "topic";
    else if (a === "--author") filterType = "author";
    else if (a.startsWith("--limit=")) limit = Number(a.split("=")[1]);
  }
  return { filterType, limit };
}

async function main() {
  const { filterType, limit } = parseArgs(process.argv.slice(2));
  const items = buildList(filterType).slice(0, limit);
  const total = items.length;

  let cursor = 0;
  let populated = 0;
  let empty = 0;
  const emptySlugs = [];
  const start = Date.now();

  const worker = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      const { entry, type } = items[i];
      await pace();
      const books = await fetchBooksForEntry(entry, type);
      if (books.length > 0) populated++;
      else { empty++; emptySlugs.push(`${type}/${entry.slug}`); }
      const done = populated + empty;
      process.stdout.write(`\r[${done}/${total}] ${type}/${entry.slug} -> ${books.length} books`);
    }
  };

  const pool = Array.from({ length: Math.min(CONCURRENCY, total) }, worker);
  await Promise.all(pool);

  const secs = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n\nDone in ${secs}s: ${populated} populated, ${empty} empty (of ${total} pages).`);
  if (emptySlugs.length) {
    console.log(`Empty pages (Google Books returned nothing): ${emptySlugs.join(", ")}`);
  }
  if (populated === 0 && total > 0) {
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
