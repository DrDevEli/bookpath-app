import AnalyticsEvent from "../models/AnalyticsEvent.js";
import logger from "../config/logger.js";

/**
 * AnalyticsService — records funnel events and computes affiliate KPIs.
 *
 * Event types:
 *   impression — a result set was rendered (search query or category page)
 *   click       — an affiliate link was clicked
 *
 * All writes are non-blocking and failures are swallowed (logged, never thrown)
 * so analytics can never take down the search/affiliate request path.
 */
class AnalyticsService {
  /**
   * Record an impression event. Fire-and-forget — never throws.
   */
  recordImpression({ source, context, resultCount = 0, userId = null, req = null }) {
    if (!source) return;
    AnalyticsEvent.create({
      type: "impression",
      source,
      context: context || null,
      resultCount,
      userId: userId || undefined,
      ipAddress: req?.ip,
      userAgent: req?.headers?.["user-agent"],
    }).catch((err) =>
      logger.warn("Failed to record impression", { source, context, error: err.message })
    );
  }

  /**
   * Record a click event. Fire-and-forget — never throws.
   */
  recordClick({
    source,
    context,
    bookId,
    bookTitle,
    authors = [],
    coverImage,
    amazonUrl,
    variant = null,
    market = "de",
    userId = null,
    req = null,
  }) {
    if (!bookId) return;
    AnalyticsEvent.create({
      type: "click",
      source,
      context: context || null,
      bookId,
      bookTitle: bookTitle || null,
      authors,
      coverImage: coverImage || null,
      amazonUrl: amazonUrl || null,
      variant: variant || null,
      market: market === "us" ? "us" : "de",
      userId: userId || undefined,
      ipAddress: req?.ip,
      userAgent: req?.headers?.["user-agent"],
    }).catch((err) =>
      logger.warn("Failed to record click", { bookId, source, context, error: err.message })
    );
  }

  /**
   * High-level funnel overview: total clicks/impressions, unique books,
   * windowed counts, and click breakdown by source.
   */
  async getOverview() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [clicksTotal, clicksToday, clicks7d, clicks30d, impTotal, impToday, imp7d, imp30d, bySource, uniqueBooks] =
      await Promise.all([
        this._count({ type: "click" }),
        this._count({ type: "click", since: startOfToday }),
        this._count({ type: "click", since: last7d }),
        this._count({ type: "click", since: last30d }),
        this._count({ type: "impression" }),
        this._count({ type: "impression", since: startOfToday }),
        this._count({ type: "impression", since: last7d }),
        this._count({ type: "impression", since: last30d }),
        AnalyticsEvent.aggregate([
          { $match: { type: "click" } },
          { $group: { _id: "$source", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        AnalyticsEvent.aggregate([
          { $match: { type: "click" } },
          { $group: { _id: null, uniqueBooks: { $addToSet: "$bookId" } } },
          { $project: { uniqueBooks: { $size: "$uniqueBooks" } } },
        ]),
      ]);

    return {
      clicks: { total: clicksTotal, today: clicksToday, last7d: clicks7d, last30d: clicks30d },
      impressions: { total: impTotal, today: impToday, last7d: imp7d, last30d: imp30d },
      uniqueBooksClicked: uniqueBooks.length > 0 ? uniqueBooks[0].uniqueBooks : 0,
      clicksBySource: bySource.map((s) => ({ source: s._id, count: s.count })),
    };
  }

  async _count({ type, since = null } = {}) {
    const match = { type };
    if (since) match.timestamp = { $gte: since };
    const rows = await AnalyticsEvent.aggregate([
      { $match: match },
      { $count: "count" },
    ]);
    return rows.length > 0 ? rows[0].count : 0;
  }

  /**
   * Top books by affiliate clicks within a window.
   */
  async getTopBooks({ days = 30, limit = 10 } = {}) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return AnalyticsEvent.aggregate([
      { $match: { type: "click", timestamp: { $gte: cutoff } } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$bookId",
          bookTitle: { $first: "$bookTitle" },
          authors: { $first: "$authors" },
          coverImage: { $first: "$coverImage" },
          clicks: { $sum: 1 },
          lastClicked: { $first: "$timestamp" },
        },
      },
      { $sort: { clicks: -1 } },
      { $limit: limit },
    ]);
  }

  /**
   * Top queries/categories by CTR within a window.
   * CTR = clicks / impressions for the same context.
   */
  async getTopQueries({ days = 30, limit = 10 } = {}) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return AnalyticsEvent.aggregate([
      {
        $match: {
          type: { $in: ["click", "impression"] },
          context: { $exists: true, $ne: null, $ne: "" },
          timestamp: { $gte: cutoff },
        },
      },
      {
        $group: {
          _id: "$context",
          impressions: {
            $sum: { $cond: [{ $eq: ["$type", "impression"] }, 1, 0] },
          },
          clicks: { $sum: { $cond: [{ $eq: ["$type", "click"] }, 1, 0] } },
        },
      },
      {
        $addFields: {
          ctr: {
            $cond: [
              { $gt: ["$impressions", 0] },
              { $divide: ["$clicks", "$impressions"] },
              0,
            ],
          },
        },
      },
      { $sort: { clicks: -1, ctr: -1 } },
      { $limit: limit },
    ]);
  }

  /**
   * Click counts per day for a rolling window (charts).
   */
  async getDailyClicks({ days = 14 } = {}) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return AnalyticsEvent.aggregate([
      { $match: { type: "click", timestamp: { $gte: cutoff } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
          },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  /**
   * Click counts grouped by CTA variant (A/B test comparison) within a window.
   */
  async getClicksByVariant({ days = 30 } = {}) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return AnalyticsEvent.aggregate([
      { $match: { type: "click", timestamp: { $gte: cutoff } } },
      { $group: { _id: { $ifNull: ["$variant", "unset"] }, clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
    ]);
  }

  /**
   * Public "trending" — most-clicked books with enough metadata to render a
   * card. Used by the Home page's top-converting section.
   */
  async getTrending({ limit = 8 } = {}) {
    return AnalyticsEvent.aggregate([
      { $match: { type: "click", bookTitle: { $exists: true, $ne: null } } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$bookId",
          bookId: { $first: "$bookId" },
          title: { $first: "$bookTitle" },
          authors: { $first: "$authors" },
          coverImage: { $first: "$coverImage" },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { clicks: -1 } },
      { $limit: limit },
    ]);
  }
}

export default new AnalyticsService();
