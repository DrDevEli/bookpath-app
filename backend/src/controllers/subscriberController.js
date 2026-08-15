import EmailSubscriber from "../models/EmailSubscriber.js";
import emailService from "../services/emailService.js";
import { ApiError } from "../utils/errors.js";
import logger from "../config/logger.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class SubscriberController {
  /**
   * POST /api/subscribers  { email, source?, context? }
   * Idempotent upsert — re-subscribing the same email does not error.
   */
  static async subscribe(req, res, next) {
    try {
      const { email, source = "book-details", context } = req.body || {};
      if (!email || !EMAIL_RE.test(String(email))) {
        throw new ApiError("A valid email address is required", 400);
      }

      const normalized = String(email).toLowerCase().trim();

      // Atomic upsert: insert on first subscribe, no-op on repeat.
      await EmailSubscriber.findOneAndUpdate(
        { email: normalized },
        { $setOnInsert: { email: normalized, source, context: context || null } },
        { upsert: true, runValidators: true }
      );

      logger.info("Email subscriber upserted", { email: normalized, source });

      // Fire-and-forget welcome email. No-op (logs only) when SMTP is
      // unconfigured; a send failure must never fail the subscribe request.
      emailService.sendWelcomeEmail(normalized).catch((e) =>
        logger.warn("Welcome email skipped/failed", { email: normalized, error: e?.message })
      );

      res.status(201).json({ success: true, data: { subscribed: true, email: normalized } });
    } catch (error) {
      // Duplicate-key race → treat as already subscribed, not an error.
      if (error?.code === 11000) {
        return res.json({ success: true, data: { subscribed: true, already: true } });
      }
      next(error);
    }
  }
}

export default SubscriberController;
