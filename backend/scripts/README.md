# BookPath automation scripts (Phase 4)

Run from the `backend/` directory (each script loads `backend/.env` explicitly).

| Script | What it does | npm script |
|--------|--------------|------------|
| `refreshSeoCache.js` | Warm/refresh all SEO landing-page caches in Redis | `npm run refresh:seo` |
| `kpiReport.js` | Print the affiliate funnel (CTR, top books, top queries) from MongoDB | `npm run report:kpi` |
| `healthCheck.js` | Exit 0/1 based on `/health` (mongo + redis connected) | `npm run health` |

## Scheduling (production)

System crontab (run as the app user, from the backend dir):

```cron
# Warm SEO caches daily at 05:00 (low traffic)
0 5 * * *  cd /path/to/bookpath-app/backend && node scripts/refreshSeoCache.js >> logs/seo-refresh.log 2>&1

# Weekly KPI report every Monday 08:00 (pipe to email/Slack as you wire it)
0 8 * * 1  cd /path/to/bookpath-app/backend && node scripts/kpiReport.js >> logs/kpi.log 2>&1

# Health check every 5 min (alert via your uptime tool's webhook/cron wrapper)
*/5 * * * * cd /path/to/bookpath-app/backend && node scripts/healthCheck.js || <alert-hook>
```

Notes:
- `refreshSeoCache.js` respects Google Books quota (171 pages ≈ 171 API calls/run; well under the 1000/day free tier). Tune `SEO_REFRESH_CONCURRENCY` (default 3).
- Cache TTL is 24h — a daily warm keeps first-visit latency near zero and keeps crawls off the live API path.
- The sitemap is generated dynamically from the catalog, so it updates the moment you add/remove a catalog entry — no separate regeneration step needed.
