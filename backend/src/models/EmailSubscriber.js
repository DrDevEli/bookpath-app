import mongoose from "mongoose";

/**
 * EmailSubscriber — the reactivation list for Phase 3 email capture.
 *
 * Collected via the optional "book deals" capture widget. Delivery (welcome +
 * weekly "best deals in your genres" email) is gated on the SMTP block being
 * configured — this model just stores the list so it's ready when SMTP lands.
 */
const emailSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Where the user subscribed from (book-details, home, footer, ...)
    source: { type: String, default: "book-details", trim: true },
    // Optional context (book title / category the user was on)
    context: { type: String, trim: true },
  },
  { timestamps: true }
);

const EmailSubscriber = mongoose.model("EmailSubscriber", emailSubscriberSchema);

export default EmailSubscriber;
