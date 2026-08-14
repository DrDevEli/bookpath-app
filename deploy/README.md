# BookPath — Production Deployment Guide

Target: a single Ubuntu VPS (Hetzner CX22, Hostinger KVM, DigitalOcean, etc.)
running nginx + Node (PM2) + MongoDB + Redis. Canonical domain: **bookpath.org**.

## Architecture (single box)

```
                      ┌─────────────────────────────────────────┐
                      │              nginx  :80/:443            │
   bookpath.org ──▶│  /, /static/        → SPA (build/)       │
                      │  /api/*, /books/*   → Express :3001      │
                      │  /sitemap.xml etc.  → Express :3001      │
                      └───────────────┬─────────────┬───────────┘
                                      │             │
                              Node/PM2 :3001   Docker: mongo + redis
                              (127.0.0.1 only)  (127.0.0.1 only)
```

The SEO landing pages (`/books/genre|topic|author/:slug`) are server-rendered by
Express, so nginx must route those paths to the backend — see `nginx.conf`.

## Prereqs (you do these once, in this order)

1. `bookpath.org` is registered at Namecheap — turn **auto-renew ON**.
2. **Provision a VPS** (Hetzner CX22 / Hostinger KVM), Ubuntu 22.04 or 24.04,
   note the public IP and root SSH access.

## Deploy (turnkey)

```bash
# On the VPS, as root:
git clone https://github.com/DrDevEli/bookpath-app.git /tmp/bookpath 2>/dev/null || true
# (or scp the repo up) — then run:
cd /opt/bookpath/deploy 2>/dev/null || { git clone https://github.com/DrDevEli/bookpath-app.git /opt/bookpath; cd /opt/bookpath/deploy; }
./setup.sh bookpath.org
```

`setup.sh` installs everything and prints the remaining manual steps.

## Manual steps after setup.sh

1. **DNS (Namecheap):** add A records `bookpath.org` → VPS IP and `www` → VPS IP.
2. **Secrets:** edit `/opt/bookpath/backend/.env`, replace every `CHANGE_ME`
   (`JWT_SECRET`, `SESSION_SECRET`, `GOOGLE_BOOKS_API_KEY`, `OPENAI_API_KEY`),
   then `pm2 restart bookpath-backend`.
3. **SSL:** `certbot --nginx -d bookpath.org -d www.bookpath.org`
   (run after DNS propagates).
4. **Indexing:** submit `https://bookpath.org/sitemap.xml` in Google Search Console.

## Ops cheat-sheet (on the VPS)

```bash
pm2 status                       # backend process
pm2 logs bookpath-backend        # backend logs
docker compose -f /opt/bookpath/deploy/docker-compose.yml ps   # mongo/redis
curl -s http://127.0.0.1:3001/health                        # health
node /opt/bookpath/backend/scripts/refreshSeoCache.js        # warm SEO caches
```

## Scheduled maintenance (crontab on the VPS)

```cron
0 5 * * *  cd /opt/bookpath/backend && node scripts/refreshSeoCache.js >> logs/seo-refresh.log 2>&1
0 8 * * 1  cd /opt/bookpath/backend && node scripts/kpiReport.js >> logs/kpi.log 2>&1
*/5 * * * * cd /opt/bookpath/backend && node scripts/healthCheck.js || curl -fsS <your-alert-webhook>
```

## Domain note

`bookpath.eu` lapsed (released from the account) — do not reference it. The
canonical domain is `bookpath.org`. All URLs (sitemap, canonical, CORS,
User-Agent) are switched to `bookpath.org`; the backend still honours a
`SITE_URL` env override if the domain ever changes again.
