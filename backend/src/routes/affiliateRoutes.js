import express from "express";
import { redirect } from "../controllers/affiliateController.js";
import rateLimiterMiddleware from "../middleware/rateLimiter.js";

const router = express.Router();

// GET /affiliate/redirect?url=...&source=amazon&bookId=...
router.get("/redirect", rateLimiterMiddleware, redirect);

export default router;



