import express from "express";
import SubscriberController from "../controllers/subscriberController.js";
import { rateLimiterMiddleware } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/", rateLimiterMiddleware, SubscriberController.subscribe);

export default router;
