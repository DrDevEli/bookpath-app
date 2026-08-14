import express from "express";
import AnalyticsController from "../controllers/analyticsController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public — powers the Home page "Trending Now" section (no PII exposed)
router.get("/trending", AnalyticsController.trending);

// Admin-only KPI endpoints
router.get("/overview", authMiddleware(["admin"]), AnalyticsController.overview);
router.get("/top-books", authMiddleware(["admin"]), AnalyticsController.topBooks);
router.get("/top-queries", authMiddleware(["admin"]), AnalyticsController.topQueries);
router.get("/daily", authMiddleware(["admin"]), AnalyticsController.daily);

export default router;
