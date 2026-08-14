import analyticsService from "../services/analyticsService.js";
import logger from "../config/logger.js";

/**
 * AnalyticsController — exposes affiliate-funnel KPIs.
 *
 * Admin endpoints (overview, top-books, top-queries, daily) are gated behind
 * authMiddleware(["admin"]) in the routes. The `trending` endpoint is public —
 * it powers the Home page's top-converting section and returns no PII.
 */
class AnalyticsController {
  static async overview(req, res, next) {
    try {
      const overview = await analyticsService.getOverview();
      res.json({ success: true, data: overview });
    } catch (error) {
      next(error);
    }
  }

  static async topBooks(req, res, next) {
    try {
      const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
      const topBooks = await analyticsService.getTopBooks({ days, limit });
      res.json({ success: true, data: topBooks });
    } catch (error) {
      next(error);
    }
  }

  static async topQueries(req, res, next) {
    try {
      const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
      const topQueries = await analyticsService.getTopQueries({ days, limit });
      res.json({ success: true, data: topQueries });
    } catch (error) {
      next(error);
    }
  }

  static async daily(req, res, next) {
    try {
      const days = Math.min(Math.max(parseInt(req.query.days) || 14, 1), 365);
      const daily = await analyticsService.getDailyClicks({ days });
      res.json({ success: true, data: daily });
    } catch (error) {
      next(error);
    }
  }

  static async clicksByVariant(req, res, next) {
    try {
      const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
      const byVariant = await analyticsService.getClicksByVariant({ days });
      res.json({ success: true, data: byVariant });
    } catch (error) {
      next(error);
    }
  }

  static async trending(req, res, next) {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 8, 1), 50);
      const trending = await analyticsService.getTrending({ limit });
      res.json({ success: true, data: trending });
    } catch (error) {
      logger.warn("Trending fetch failed", { error: error.message });
      // Trending is a non-critical public surface — degrade gracefully.
      res.json({ success: true, data: [] });
    }
  }
}

export default AnalyticsController;
