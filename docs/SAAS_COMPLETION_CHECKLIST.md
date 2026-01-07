### BookPath SaaS Completion Checklist

Use this concise checklist to take BookPath to a production-ready SaaS for discovering and buying books with affiliate links.

---

### 1) Foundations and Environments
- [ ] Domains: `bookpath.eu` (frontend), `api.bookpath.eu` (backend)
- [ ] Backend on Railway (custom domain bound)
- [ ] Frontend on Vercel (custom domain bound)
- [ ] HTTPS verified for both domains

#### Vercel (Frontend) Environment Variables
- [ ] `REACT_APP_API_BASE_URL=https://api.bookpath.eu`
- [ ] `REACT_APP_BACKEND_URL=https://api.bookpath.eu`
- [ ] `REACT_APP_FRONTEND_URL=https://bookpath.eu`
- [ ] `REACT_APP_UMAMI_WEBSITE_ID=<id>`
- [ ] `REACT_APP_UMAMI_SCRIPT_URL=https://analytics.bookpath.eu/script.js`
- [ ] `NODE_ENV=production`

#### Railway (Backend) Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `TRUST_PROXY=true`
- [ ] `MONGODB_URI=...`
- [ ] `REDIS_URL=...`
- [ ] `JWT_SECRET=...`
- [ ] `JWT_REFRESH_SECRET=...`
- [ ] `SESSION_SECRET=...`
- [ ] `CORS_ORIGIN=https://bookpath.eu`
- [ ] `FRONTEND_URL=https://bookpath.eu`
- [ ] `AMAZON_ASSOCIATES_TAG=...`
- [ ] `AMAZON_DOMAIN=amazon.de`
- [ ] (Optional email) `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

---

### 2) Backend Completion
- [ ] Normalize result DTO fields across sources
- [ ] Add filters: `category`, `condition=new|used` (exclude `unknown` when filter set)
- [ ] Sorting: `relevance` (default), `newest`, `author_az`
- [ ] Redis caching per query + filters
- [ ] Affiliate links enrichment (Amazon/Booklooker)
- [ ] Affiliate redirect + click tracking endpoint
- [ ] Collections CRUD + shareable links
- [ ] Email links use `FRONTEND_URL`

---

### 3) Frontend Completion
- [ ] Book Search: inputs + filters (category, condition) + sort + pagination
- [ ] Result cards: category label and New/Used badge when known
- [ ] Details: buy buttons per source; track then redirect
- [ ] Collections: add/save/share; default private
- [ ] Onboarding: genres/languages; store in `user.preferences`
- [ ] Umami analytics gated by cookie consent
- [ ] Affiliate Disclosure page + footer note

---

### 4) Payments (Stripe)
- [ ] Products/prices for Free/Pro
- [ ] Checkout + Customer Portal
- [ ] Webhooks to update `subscriptionTier`
- [ ] Feature gates and rate limits by tier

---

### 5) Analytics, SEO, Security
- [ ] Events: search, result click, affiliate click, add to collection, signup
- [ ] Sitemap, meta/OG for details/collections
- [ ] Privacy, Terms, Cookie, Disclosure pages
- [ ] CORS restricted to production domain; rate limits tuned

---

### 6) QA & Launch
- [ ] E2E: search → details → buy → save → share
- [ ] Email flows verified
- [ ] Mobile checks; performance (LCP < 2.5s)
- [ ] Monitoring/alerts on Railway


