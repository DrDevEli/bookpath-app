import Stripe from "stripe";
import logger from "../config/logger.js";
import User from "../models/User.js";
import { ApiError } from "../utils/errors.js";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  logger.warn("STRIPE_SECRET_KEY is not set. Stripe service will be disabled.");
}

export const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2024-06-20" }) : null;

/**
 * Ensure a Stripe customer exists for the user and return it
 */
export async function createOrRetrieveCustomer(userId) {
  if (!stripe) throw new ApiError("Stripe is not configured", 500);
  const user = await User.findById(userId);
  if (!user) throw new ApiError("User not found", 404);

  if (user.stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      if (!customer.deleted) return customer;
    } catch (e) {
      logger.warn("Existing stripe customer retrieval failed, creating new", {
        userId,
        error: e.message,
      });
    }
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.username,
    metadata: { userId: String(user._id) },
  });

  user.stripeCustomerId = customer.id;
  await user.save();
  return customer;
}

/**
 * Create a Checkout Session for Pro subscription
 */
export async function createCheckoutSession({ userId, priceId, successUrl, cancelUrl }) {
  if (!stripe) throw new ApiError("Stripe is not configured", 500);
  const customer = await createOrRetrieveCustomer(userId);
  const resolvedPriceId = priceId || process.env.STRIPE_PRICE_PRO_MONTHLY;
  if (!resolvedPriceId) throw new ApiError("Price ID not configured", 500);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    line_items: [{ price: resolvedPriceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId: String(userId) },
    allow_promotion_codes: true,
  });
  return session;
}

/**
 * Create a Billing Portal Session for the user
 */
export async function createBillingPortalSession({ userId, returnUrl }) {
  if (!stripe) throw new ApiError("Stripe is not configured", 500);
  const customer = await createOrRetrieveCustomer(userId);
  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: returnUrl,
  });
  return session;
}

function isActiveSubscriptionStatus(status) {
  return ["trialing", "active", "past_due"].includes(status);
}

async function handleCheckoutSessionCompleted(event) {
  const session = event.data.object;
  const userId = session.metadata?.userId;
  if (!userId) return;
  try {
    const subscriptionId = session.subscription;
    const user = await User.findById(userId);
    if (!user) return;
    user.subscriptionTier = "pro";
    user.stripeSubscriptionId = typeof subscriptionId === "string" ? subscriptionId : subscriptionId?.id;
    await user.save();
    logger.info("Upgraded user to pro after checkout", { userId });
  } catch (e) {
    logger.error("Failed to update user after checkout", { error: e.message, userId });
  }
}

async function handleSubscriptionUpdated(event) {
  const subscription = event.data.object;
  const customerId = subscription.customer;
  try {
    const user = await User.findOne({ stripeCustomerId: customerId });
    if (!user) return;
    if (isActiveSubscriptionStatus(subscription.status)) {
      user.subscriptionTier = "pro";
      user.stripeSubscriptionId = subscription.id;
    } else {
      user.subscriptionTier = "free";
    }
    await user.save();
    logger.info("Updated user subscription tier from webhook", {
      userId: user._id,
      status: subscription.status,
    });
  } catch (e) {
    logger.error("Failed to update user from subscription webhook", {
      error: e.message,
      customerId,
    });
  }
}

/**
 * Verify webhook signature and dispatch event handlers
 */
export async function handleWebhook({ rawBody, signature }) {
  if (!stripe) throw new ApiError("Stripe is not configured", 500);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new ApiError("Webhook secret not configured", 500);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    logger.warn("Stripe webhook signature verification failed", { error: err.message });
    throw new ApiError("Invalid signature", 400);
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await handleSubscriptionUpdated(event);
      break;
    default:
      logger.debug("Unhandled Stripe event", { type: event.type });
  }

  return { received: true };
}

export default {
  createOrRetrieveCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  handleWebhook,
};


