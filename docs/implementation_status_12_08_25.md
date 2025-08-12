## BookPath — Implementation Status and Launch Checklist (12-08-2025)

This document captures the current status of BookPath (api.bookpath.eu / bookpath.eu) and a practical, end-to-end checklist to reach a production-grade, profitable launch. It is organized for real-world delivery, and can serve as a proof of execution and planning quality.

### 1) Backend (API)
Status: 80% complete

- Auth and Security
  - Email/password auth, JWT access/refresh tokens — implemented
  - Logout, logout-all, CSRF token endpoint — implemented
  - 2FA setup/verify/disable — implemented
  - Email verification flow — implemented
  - Roles — `user`, `chefaodacasa` — implemented
  - Rate limiting with elevated admin limits — implemented
  - Request/response logging with Winston — implemented
  - ✅ Add per-endpoint `proOnly` gating where applicable — COMPLETED
  - TODO:
    - Strengthen JWT audience/issuer enforcement across code
    - Full unit/integration test suite coverage for auth and rate limiting

- Users
  - Registration, login, profile, preferences, password change — implemented
  - ✅ GDPR endpoints (data export, delete account) — COMPLETED
  - ✅ Email notification preferences (granular) — COMPLETED

- Books and Search
  - Search, advanced search, book by id, author details — implemented
  - Integrations with Open Library/Google Books/Gutendex — present
  - TODO:
    - Caching policies by tier (longer TTL for Pro or prefetching)
    - Advanced filters gated by Pro (if part of offering)
    - Observability on external API latency/error budget

- Collections
  - CRUD, stats, sharing, books within collections — implemented
  - TODO:
    - Collaboration model (roles: viewer/editor) refinement
    - Activity feed/audit per collection
    - Public collection SEO pages (via frontend)

- Billing (Stripe)
  - Implemented service: customers, checkout sessions, billing portal
  - Webhook with raw-body verification; user `subscriptionTier` sync — implemented
  - Model fields added: `stripeCustomerId`, `stripeSubscriptionId`
  - ✅ OpenAPI documentation for billing endpoints — COMPLETED
  - TODO:
    - Expand events handled (payment failures, invoice.finalized)
    - Automated downgrades with grace periods logic
    - Usage-based add-ons (if planned)

- Documentation
  - Swagger UI served from OpenAPI YAML — implemented
  - ✅ Add billing endpoints to `openapi.yaml` — COMPLETED
  - ✅ Ensure examples and schemas for all endpoints — COMPLETED

### 2) Frontend (Web App)
Status: 65% complete

- Core UI
  - Auth pages, Home, Book search, Collections, Book details — present
  - Components and basic styles — present
  - TODO:
    - Billing UI: “Upgrade to Pro” (Checkout), “Manage Subscription” (Portal)
    - Success/Cancel/Settings Billing pages and flows
    - Pro-only feature affordances and upsell modals
    - Profile page: display `subscriptionTier`, 2FA status, email verification state
    - Empty states, loading skeletons audit, error toasts standardization
    - A11y pass and keyboard navigation

- Performance
  - TODO:
    - Bundle analysis and code-splitting where heavy
    - Image optimization and lazy loading
    - Client caching strategies aligned with API TTLs

### 3) DevOps / Infrastructure (AWS)
Status: Plan + partial implementation

- Cloud Architecture (AWS target)
  - VPC with private subnets and NAT
  - ECS Fargate or Elastic Beanstalk for API, or EC2 ASG (pick one)
  - AWS ALB with HTTPS (ACM certificates for `api.bookpath.eu`)
  - AWS RDS (if migrating from Mongo) or continue with Managed Mongo (Atlas)
  - ElastiCache Redis for rate limiting/whitelist/blacklist
  - S3 for assets/backups, CloudFront CDN for `bookpath.eu`
  - Route 53 for DNS, SES for email (optional if replacing SMTP)
  - TODO:
    - Choose runtime: ECS Fargate vs Beanstalk, create IaC
    - Terraform or CDK for: VPC, ALB, ECS services, IAM roles, Secrets Manager, RDS/ElastiCache/S3/CloudFront, Route 53
    - GitHub Actions CI/CD → ECR build + ECS deploy (blue/green)
    - Autoscaling policies, health checks, alarms (CloudWatch)
    - WAF rules on ALB/CloudFront (basic OWASP ruleset)
    - Log aggregation and retention (CloudWatch Logs, S3 lifecycle)
    - Backups and disaster recovery runbooks

- Secrets and Config
  - Use AWS Secrets Manager for JWT, SMTP/SES, Stripe keys
  - Parameter Store for non-secret config
  - TODO:
    - Migrate `.env` to Secrets Manager, update app to load at startup

- Monitoring/Observability
  - CloudWatch metrics, logs, dashboards
  - Traces (X-Ray or OpenTelemetry to vendor)
  - TODO:
    - Alerts: error rates, 5xx, latency, Stripe webhook failures, Redis saturation
    - Synthetics canaries for key flows

### 4) Security & Compliance
Status: Ongoing

- App Security
  - Helmet/security middleware — implemented
  - JWT invalidation via versioning + redis black/whitelist — present
  - Rate limiting per role — implemented
  - TODO:
    - Vulnerability scanning (Snyk/GitHub Dependabot) and npm audit pipeline
    - Pen test and threat model
    - CSRF double-submit validation consistently enforced where relevant
    - Add CSP and strict cookie attributes review

- Data Protection / GDPR
  - TODO:
    - Privacy Policy and Terms of Service pages
    - Data export (user data dump) endpoint
    - Data deletion and retention policy
    - Records of processing activities
    - DPO contact and breach response plan

- Payments Compliance
  - Stripe handles PCI — ensure SAQ A scope
  - TODO:
    - Webhook IP allowlisting or signature retry logic
    - Clear dunning communications for failed payments

### 5) Payments & Pricing
Status: Ready for internal test

- Stripe
  - Product and Prices to be created (Pro monthly [+ yearly optional])
  - Webhook configured to `/api/v1/billing/webhook`
  - TODO:
    - Coupon/promo flows (optional)
    - Proration and upgrade/downgrade rules
    - Grace period and re-activation logic

- Pricing Strategy
  - TODO:
    - Define Pro value props (advanced filters, higher rate limits, priority features)
    - Define pricing and trial rules
    - Landing page pricing section and FAQ

### 6) Analytics, Tracking, and Insights
Status: Not integrated

- Product Analytics
  - TODO:
    - Integrate Plausible/GA4/PostHog (server-side events for API usage)
    - Funnel tracking: signup → search → collection → upgrade
    - Event taxonomy and dashboards

- Marketing Attribution
  - TODO:
    - UTM tracking, campaign pages
    - Conversion events from checkout to CRM/analytics

### 7) Content & Marketing
Status: In progress

- Brand & Copy
  - Brand guidelines and assets present
  - TODO:
    - Website copy: home/landing, pricing, features, about, privacy, terms
    - Screenshots, demo video, animated GIFs
    - Blog setup (SaaS content strategy: SEO for "book discovery", "personal library", etc.)

- Channels
  - TODO:
    - Email list and newsletter signup (ConvertKit/Mailchimp/SES)
    - Twitter/X, LinkedIn, Reddit communities (book lovers)
    - Product Hunt launch plan
    - Partnerships: affiliate networks, niche communities

- SEO
  - TODO:
    - Meta tags, OG tags, sitemap, robots.txt
    - Server-side rendering for public/shared pages or static generation
    - Structured data for collections/books

### 8) Customer Support & Ops
Status: Not set up

- Support
  - TODO:
    - Support email/inbox, SLA, canned responses
    - In-app help widget/FAQ
    - Status page (UptimeRobot/Statuspage)

- Legal
  - TODO:
    - Terms of Service, Privacy Policy, Cookie Policy
    - DPA for EU users if using third-party processors

### 9) QA and Testing
Status: Partial

- Automated Tests
  - Some tests present; needs expansion
  - TODO:
    - Unit tests: controllers, services (billing, email, search)
    - Integration tests: auth flows, webhooks, collections
    - E2E smoke tests (Playwright/Cypress) across key flows

- Performance/Load
  - TODO:
    - Load tests for search endpoints and collection operations
    - Spike tests for webhook handler

### 10) Launch Readiness Checklist

- Engineering
  - [ ] Complete billing UI and `proOnly` feature gates
  - [ ] Add OpenAPI docs for billing endpoints; regenerate client if used
  - [ ] CI/CD to AWS (blue/green or rolling), IaC committed
  - [ ] Monitoring/alerts and logs in place
  - [ ] Backups and recovery tested

- Security & Compliance
  - [ ] Privacy/Terms/Policies live
  - [ ] GDPR export/delete endpoints verified
  - [ ] npm audit clean, Snyk checks, dependency updates
  - [ ] Basic WAF rules configured

- Payments
  - [ ] Stripe product/prices, test checkout, webhook verified
  - [ ] Dunning emails configured (failed payments)

- Analytics & Marketing
  - [ ] Analytics integrated; funnels defined
  - [ ] Pricing page and landing copy finalized
  - [ ] Email list capture set up
  - [ ] Launch plan (Product Hunt, communities) with dates

- Operations
  - [ ] Support inbox and FAQ ready
  - [ ] Status page live
  - [ ] On-call/incident process (lightweight) defined

### 11) Immediate Next Actions (1–2 days)

1. ✅ Add billing endpoints to OpenAPI and regenerate frontend client. — COMPLETED
2. Implement frontend billing flows (checkout and portal).
3. Select AWS runtime (ECS Fargate vs Beanstalk), scaffold Terraform.
4. Move secrets to AWS Secrets Manager; configure deployments.
5. Integrate analytics (Plausible/PostHog) and basic funnels.
6. Draft pricing page/copy and publish policies.

---
Owner: BookPath Team • Repo: bookpath-app • Updated: 12-08-2025


