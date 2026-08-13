import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { rateLimiterMiddleware } from "../middleware/rateLimiter.js";
import {
  getRecommendations,
  refreshRecommendations,
} from "../services/aiRecommendationService.js";
import logger from "../config/logger.js";

const router = express.Router();

/**
 * @swagger
 * /recommendations:
 *   get:
 *     tags: [Recommendations]
 *     summary: Get AI-powered book recommendations
 *     description: Returns personalized book recommendations based on the user's reading history, powered by AI. Results are cached for 24 hours.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                           authors:
 *                             type: array
 *                             items:
 *                               type: string
 *                           reason:
 *                             type: string
 *                           matchScore:
 *                             type: number
 *                           similarTo:
 *                             type: string
 *                     profile:
 *                       type: object
 *                     generatedAt:
 *                       type: string
 *                     fromCache:
 *                       type: boolean
 *                 note:
 *                   type: string
 *                   description: Advisory note if recommendations could not be generated
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 *       503:
 *         description: AI service unavailable
 */
router.get(
  "/",
  authMiddleware(),
  rateLimiterMiddleware,
  async (req, res, next) => {
    try {
      const result = await getRecommendations(req.user.id);

      if (result.recommendations.length === 0 && result.note) {
        return res.status(200).json({
          success: true,
          data: result,
          note: result.note,
        });
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Failed to get recommendations", {
        userId: req.user?.id,
        error: error.message,
      });

      if (error.message.includes("OPENAI_API_KEY")) {
        return res.status(503).json({
          success: false,
          error: "AI recommendation service is not configured",
        });
      }

      if (error.message.includes("OpenAI API error")) {
        return res.status(503).json({
          success: false,
          error: "AI recommendation service is temporarily unavailable",
        });
      }

      next(error);
    }
  }
);

/**
 * @swagger
 * /recommendations/refresh:
 *   post:
 *     tags: [Recommendations]
 *     summary: Force refresh AI recommendations
 *     description: Bypasses the cache and generates fresh AI-powered book recommendations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommendations refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     recommendations:
 *                       type: array
 *                     profile:
 *                       type: object
 *                     generatedAt:
 *                       type: string
 *                     refreshed:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 *       503:
 *         description: AI service unavailable
 */
router.post(
  "/refresh",
  authMiddleware(),
  rateLimiterMiddleware,
  async (req, res, next) => {
    try {
      const result = await refreshRecommendations(req.user.id);

      if (result.recommendations.length === 0 && result.note) {
        return res.status(200).json({
          success: true,
          data: result,
          note: result.note,
        });
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Failed to refresh recommendations", {
        userId: req.user?.id,
        error: error.message,
      });

      if (error.message.includes("OPENAI_API_KEY")) {
        return res.status(503).json({
          success: false,
          error: "AI recommendation service is not configured",
        });
      }

      if (error.message.includes("OpenAI API error")) {
        return res.status(503).json({
          success: false,
          error: "AI recommendation service is temporarily unavailable",
        });
      }

      next(error);
    }
  }
);

export default router;
