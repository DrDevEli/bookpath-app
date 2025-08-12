import { createBillingPortalSession, createCheckoutSession, handleWebhook } from "../services/stripeService.js";
import { ApiError } from "../utils/errors.js";
import logger from "../config/logger.js";

/**
 * Create Stripe Checkout session
 */
export const createCheckout = async (req, res, next) => {
  try {
    const priceId = req.body?.priceId || process.env.STRIPE_PRICE_PRO_MONTHLY;
    const successUrl = `${process.env.FRONTEND_URL}/billing/success`;
    const cancelUrl = `${process.env.FRONTEND_URL}/billing/cancel`;

    if (!priceId) throw new ApiError("Price ID not configured", 500);

    const session = await createCheckoutSession({
      userId: req.user.id,
      priceId,
      successUrl,
      cancelUrl,
    });
    
    res.status(200).json({ 
      success: true, 
      url: session.url, 
      id: session.id 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create Stripe Billing Portal session
 */
export const createPortal = async (req, res, next) => {
  try {
    const returnUrl = `${process.env.FRONTEND_URL}/settings/billing`;
    const session = await createBillingPortalSession({ 
      userId: req.user.id, 
      returnUrl 
    });
    
    res.status(200).json({ 
      success: true, 
      url: session.url 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handle Stripe webhook events
 */
export const webhook = async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    const rawBody = req.body;

    if (!signature) {
      throw new ApiError("Missing stripe-signature header", 400);
    }

    await handleWebhook({ rawBody, signature });
    
    logger.info("Stripe webhook processed successfully");
    res.status(200).json({ received: true });
  } catch (err) {
    logger.error("Stripe webhook processing failed", { error: err.message });
    next(err);
  }
};