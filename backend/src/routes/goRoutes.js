import express from "express";
import RedirectController from "../controllers/redirectController.js";
import { rateLimiterMiddleware } from "../middleware/rateLimiter.js";

/**
 * Measured outbound redirect. Mounted at /api/go so nginx's existing
 * `location /api/` proxy handles it — no nginx change is needed to add it.
 *
 *   GET /api/go?u=<amazon url>&s=<channel>&c=<context>&b=<bookId>&sig=<hmac>
 *
 * The link is minted by services/trackedLink.js and is the ONLY way a
 * server-rendered CTA reaches Amazon, so click attribution can never be
 * silently absent again.
 */
const router = express.Router();

router.get("/", rateLimiterMiddleware, RedirectController.trackAndRedirect);

export default router;
