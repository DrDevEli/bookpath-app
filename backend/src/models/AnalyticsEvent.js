import mongoose from "mongoose";

/**
 * AnalyticsEvent — unified analytics store for the affiliate/revenue funnel.
 *
 * One collection tracks two event types:
 *   - "impression": a search/category/featured result set was shown to a user
 *   - "click":       a user clicked an Amazon affiliate link
 *
 * Tracking impressions + clicks in the same collection with a shared `context`
 * field is what makes CTR (click-through rate) computable per search query and
 * per category:  CTR(context) = clicks(context) / impressions(context).
 */
const analyticsEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["impression", "click"],
      index: true,
    },
    // Where the event originated (which surface the user was on)
    source: {
      type: String,
      required: true,
      enum: [
        "search",
        "category",
        "featured",
        "book-details",
        "recommendation",
        "library",
        "trending",
      ],
    },
    // The query string (search) or category name that led to the event.
    // This is the join key for CTR computation.
    context: {
      type: String,
      trim: true,
      index: true,
    },
    // Click-only fields (book being clicked through to Amazon)
    bookId: { type: String, trim: true, index: true },
    bookTitle: { type: String, trim: true },
    authors: { type: [String] },
    coverImage: { type: String, trim: true },
    amazonUrl: { type: String, trim: true },

    // Impression-only field: how many books were shown
    resultCount: { type: Number, min: 0 },

    // Optional attribution
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ipAddress: { type: String },
    userAgent: { type: String },

    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Compound indexes for the common aggregation shapes
analyticsEventSchema.index({ type: 1, timestamp: -1 });
analyticsEventSchema.index({ type: 1, context: 1, timestamp: -1 });
analyticsEventSchema.index({ type: 1, bookId: 1, timestamp: -1 });

const AnalyticsEvent = mongoose.model("AnalyticsEvent", analyticsEventSchema);

export default AnalyticsEvent;
