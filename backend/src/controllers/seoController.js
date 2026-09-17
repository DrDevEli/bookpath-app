import {
  GENRE_BY_SLUG,
  TOPIC_BY_SLUG,
  AUTHOR_BY_SLUG,
} from "../data/seoCatalog.js";
import {
  renderLandingPage,
  renderHub,
  renderBookDetail,
  renderSitemapXml,
  renderRobotsTxt,
} from "../services/seoService.js";
import { fetchBooksForEntry } from "../services/seoBookFetcher.js";
import { getGoogleBookById, searchGoogleBooks } from "../services/googleBooksService.js";
import amazonAffiliateService from "../services/amazonAffiliateService.js";
import { resolveMarket } from "../utils/marketResolver.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";
import redis from "../config/redis.js";
import logger from "../config/logger.js";

function html(res, body, status = 200) {
  res.status(status);
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
  res.send(body);
}

// Top clicked book ids for the sitemap (bounded, cached — the sitemap is hit on
// every crawl and this is a Mongo aggregation).
const TOP_BOOKS_CACHE_KEY = "seo:sitemap:topbooks";
const TOP_BOOKS_TTL = 6 * 60 * 60;
const TOP_BOOKS_LIMIT = 200;

async function topBookIds() {
  try {
    const cached = await redis.get(TOP_BOOKS_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    logger.warn("Sitemap top-books cache read failed", { error: err.message });
  }

  let ids = [];
  try {
    const rows = await AnalyticsEvent.aggregate([
      { $match: { type: "click", bookId: { $regex: "^google-" } } },
      { $group: { _id: "$bookId", clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: TOP_BOOKS_LIMIT },
    ]);
    ids = rows.map((r) => r._id).filter(Boolean);
  } catch (err) {
    logger.warn("Sitemap top-books query failed", { error: err.message });
  }

  try {
    await redis.set(TOP_BOOKS_CACHE_KEY, JSON.stringify(ids), "EX", TOP_BOOKS_TTL);
  } catch (err) {
    logger.warn("Sitemap top-books cache write failed", { error: err.message });
  }
  return ids;
}

class SeoController {
  static async renderGenre(req, res, next) {
    try {
      const entry = GENRE_BY_SLUG[req.params.slug];
      if (!entry) return res.status(404).send("Genre not found");
      const market = resolveMarket(req);
      const books = await fetchBooksForEntry(entry, "genre");
      const linked = await amazonAffiliateService.addAffiliateLinksToBooks(books, market);
      html(res, renderLandingPage({ type: "genre", entry, books: linked, market }));
    } catch (err) {
      next(err);
    }
  }

  static async renderTopic(req, res, next) {
    try {
      const entry = TOPIC_BY_SLUG[req.params.slug];
      if (!entry) return res.status(404).send("Topic not found");
      const market = resolveMarket(req);
      const books = await fetchBooksForEntry(entry, "topic");
      const linked = await amazonAffiliateService.addAffiliateLinksToBooks(books, market);
      html(res, renderLandingPage({ type: "topic", entry, books: linked, market }));
    } catch (err) {
      next(err);
    }
  }

  static async renderAuthor(req, res, next) {
    try {
      const entry = AUTHOR_BY_SLUG[req.params.slug];
      if (!entry) return res.status(404).send("Author not found");
      const market = resolveMarket(req);
      const books = await fetchBooksForEntry(entry, "author");
      const linked = await amazonAffiliateService.addAffiliateLinksToBooks(books, market);
      html(res, renderLandingPage({ type: "author", entry, books: linked, market }));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Server-rendered book detail page. nginx sends crawlers and link-preview
   * bots here (see the bp_is_bot map in deploy/nginx.conf); humans keep the SPA.
   * Unknown ids answer a real 404 instead of the SPA's 200 shell.
   *
   * The raw book + related titles are cached in Redis, so a crawler burst costs
   * one Google Books request per book per 6h instead of one per hit.
   */
  static async renderBook(req, res, next) {
    try {
      const { id } = req.params;
      if (!id) return res.status(404).send("Book not found");

      const market = resolveMarket(req);
      const cacheKey = `seo:bookdetail:${id}`;
      let payload = null;

      // URL convention is `google-<volumeId>`; the Google Books by-id endpoint
      // expects the RAW volume id and answers a malformed one with 503 (not
      // 404), so strip the prefix — and refuse anything that is not a Google
      // Books id outright instead of asking Google about it.
      if (!id.startsWith("google-")) {
        return res.status(404).send("Book not found");
      }
      const volumeId = id.replace(/^google-/, "");
      if (!volumeId) return res.status(404).send("Book not found");

      try {
        const cached = await redis.get(cacheKey);
        if (cached) payload = JSON.parse(cached);
      } catch (err) {
        logger.warn("Book detail cache read failed", { id, error: err.message });
      }

      if (!payload) {
        let book;
        try {
          book = await getGoogleBookById(volumeId);
        } catch (err) {
          const status = err?.statusCode;
          // Only a real "no such volume" is a 404. A quota/upstream failure must
          // NOT be reported as gone or Google will drop the page from the index.
          if (status === 404 || status === 400) {
            return res.status(404).send("Book not found");
          }
          logger.warn("Book detail upstream failure", { id, volumeId, error: err.message });
          res.set("Retry-After", "3600");
          return res.status(503).send("Temporarily unavailable");
        }
        if (!book) return res.status(404).send("Book not found");

        let related = [];
        const author = (book.authors || [])[0];
        if (author) {
          try {
            const more = await searchGoogleBooks({ author, page: 1 });
            related = (more || []).filter((b) => b.id && b.id !== book.id).slice(0, 4);
          } catch (err) {
            logger.warn("Book detail related fetch failed", { id, error: err.message });
          }
        }

        payload = { book, related };
        try {
          await redis.set(cacheKey, JSON.stringify(payload), "EX", 6 * 60 * 60);
        } catch (err) {
          logger.warn("Book detail cache write failed", { id, error: err.message });
        }
      }

      const [linked] = await amazonAffiliateService.addAffiliateLinksToBooks(
        [payload.book],
        market
      );

      html(res, renderBookDetail({ book: linked || payload.book, related: payload.related || [], market }));
    } catch (err) {
      next(err);
    }
  }

  static renderHub(req, res) {
    html(res, renderHub());
  }

  static async renderSitemap(req, res, next) {
    try {
      const bookIds = await topBookIds();
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.send(renderSitemapXml(bookIds));
    } catch (err) {
      next(err);
    }
  }

  static renderRobots(req, res) {
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send(renderRobotsTxt());
  }
}

export default SeoController;
