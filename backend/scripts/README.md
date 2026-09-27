# BookPath automation scripts (Phase 4)

Run from the `backend/` directory (each script loads `backend/.env` explicitly).

| Script | What it does | npm script |
|--------|--------------|------------|
| `refreshSeoCache.js` | Warm/refresh all SEO landing-page caches in Redis, then self-check them | `npm run refresh:seo` |
| `kpiReport.js` | Print the affiliate funnel (CTR, top books, top queries) from MongoDB | `npm run report:kpi` |
| `healthCheck.js` | Exit 0/1 based on `/health` (mongo + redis connected) | `npm run health` |

## refreshSeoCache.js flags

| Flag | Effect |
|------|--------|
| *(none)* | Walk the catalog, honouring the cache — a hit is returned, not rewritten |
| `--force` | Re-fetch and REWRITE every page (this is what the cron uses) |
| `--cold-only` | Only pages without a fresh payload; implies `--force` |
| `--audit-only` | READ-ONLY: report cache health, zero Google Books requests |
| `--genre` / `--topic` / `--author` | Restrict to one section |
| `--limit=N` | Stop after N pages |

The run ends with an authoritative audit line, e.g.

```
Done in 168.9s: 154 populated, 0 empty (of 154 pages) [refetch=154 mode=force].
Cache audit: 154 fresh, 0 stale, 0 cold of 154 catalog pages.
OK: all 154 pages in scope hold a freshly written payload.
```

**Verify the audit line, not the "populated" counter.** "Populated" counts pages that
*returned* books, which used to include cache hits that were never rewritten — so a run
could log 154/154 green while 26 pages went cold the same afternoon (2026-09-26 incident).
The audit reads EXISTS + TTL per page and only passes pages holding a payload written by
that run; anything short prints the offending slugs and exits non-zero. `--audit-only`
relaxes that to "no page may be MISSING a payload" (a key from yesterday's warm is healthy
between runs) and prints the newest/oldest write age.

## Scheduling (production)

System crontab on the VPS, **in VPS time (UTC)** — the box is `Etc/UTC`:

```cron
# Warm all 154 SEO landing-page caches daily at 08:30 UTC. This MUST be after the
# Google Books daily quota reset at 00:00 PT = 07:00 UTC (PDT) / 08:00 UTC (PST),
# otherwise the run burns the tail of the already-spent quota and leaves pages cold.
30 8 * * * cd /opt/bookpath/backend && node scripts/refreshSeoCache.js --force >> logs/seo-refresh.log 2>&1

# Weekly KPI report every Monday 08:00
0 8 * * 1 cd /opt/bookpath/backend && node scripts/kpiReport.js >> logs/kpi.log 2>&1

# Health check every 5 min (alerts via your uptime tool's webhook/cron wrapper)
*/5 * * * * cd /opt/bookpath/backend && node scripts/healthCheck.js >> logs/health.log 2>&1
```

Notes:
- `--force` is not optional in cron: without it the daily job only *re-arms* TTLs on cache
  hits instead of refreshing content, and reports those pages as successful.
- A full warm is 154 Google Books requests against a 1,000/day free-tier quota. Tune
  `SEO_REFRESH_CONCURRENCY` (default 3) and `SEO_REFRESH_INTERVAL_MS` (default 1100) if
  Google throttles.
- Cache TTL is 72h so a missed or quota-blocked run costs freshness, not availability. A
  fetch failure keeps the last good payload alive (stale-while-revalidate) and an empty
  upstream result is never cached.
- The sitemap is generated dynamically from the catalog, so it updates the moment you
  add/remove a catalog entry — no separate regeneration step needed.
