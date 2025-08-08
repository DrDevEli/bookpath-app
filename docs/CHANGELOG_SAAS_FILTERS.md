### SaaS Search & Filters Update

Backend
- `backend/src/controllers/bookController.js`
  - New query params: `category`, `condition` (new|used), `sort` (newest|author_az)
  - Cache key includes new params
  - Pass-through to search service
- `backend/src/services/bookSearchService.js`
  - Normalizes `category` and `condition`; excludes `unknown` when condition filter selected
  - Adds sorting (relevance default; newest; author A–Z)
  - Keeps pagination (20 per page)

Frontend
- `frontend/src/components/BookSearch.tsx`
  - Added Category, Condition, and Sort controls; persists across pagination
- `frontend/src/components/BookCard.tsx`
  - Shows category and New/Used badge when available

Notes
- Condition is reliably provided primarily by Booklooker; other sources may be `unknown` and are excluded when filtering.

