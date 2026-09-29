import express from "express";
import AnalyticsController from "../controllers/analyticsController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { rateLimiterMiddleware } from "../middleware/rateLimiter.js";

const router = express.Router();

// Public — powers the Home page "Trending Now" section (no PII exposed)
router.get("/trending", AnalyticsController.trending);

// Public + rate-limited — records an on-site arrival from an acquisition
// channel (the /links hub calls this on mount), so channel → visit is
// measurable instead of assumed.
router.post("/visit", rateLimiterMiddleware, AnalyticsController.visit);

// Admin-only KPI endpoints
router.get("/overview", authMiddleware(["admin"]), AnalyticsController.overview);
router.get("/top-books", authMiddleware(["admin"]), AnalyticsController.topBooks);
router.get("/top-queries", authMiddleware(["admin"]), AnalyticsController.topQueries);
router.get("/daily", authMiddleware(["admin"]), AnalyticsController.daily);
router.get("/clicks-by-variant", authMiddleware(["admin"]), AnalyticsController.clicksByVariant);

export default router;
