import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { createCheckout, createPortal, webhook } from "../controllers/billingController.js";

const router = express.Router();

// POST /billing/checkout — create checkout session
router.post("/checkout", authMiddleware(), createCheckout);

// POST /billing/portal — create billing portal session
router.post("/portal", authMiddleware(), createPortal);

// POST /billing/webhook — handle Stripe webhooks (no auth middleware)
router.post("/webhook", webhook);

export default router;


