import { searchGoogleBooks } from "../services/googleBooksService.js";
import amazonAffiliateService from "../services/amazonAffiliateService.js";
import {
  GENRE_BY_SLUG,
  TOPIC_BY_SLUG,
  AUTHOR_BY_SLUG,
} from "../data/seoCatalog.js";
import {
  renderLandingPage,
  renderHub,
  renderSitemapXml,
  renderRobotsTxt,
} from "../services/seoService.js";
import redis from "../config/redis.js";
import logger from "../config/logger.js";

const CACHE_TTL = 24 * 60 * 60; // 24h — books don't change that often
const MAX_BOOKS = 12;

/**
 * Build the Google Books search params for a given catalog entry type.
 */
function searchParams(entry, type) {
  if (type === "genre") return { subject: entry.query, page: 1 };
  if (type === "author") return { author: entry.query, page: 1 };
  return { q: entry.query, page: 1 };
}

/**
 * Fetch + cache books for a landing page. Falls back to an empty list on any
 * upstream failure so the page still renders (SEO resilience over 500s).
 */
async function fetchBooks(entry, type) {
  const cacheKey = `seo:${type}:${entry.slug}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const books = JSON.parse(cached);
      logger.debug("SEO book cache hit", { type, slug: entry.slug, count: books.length });
      return books;
    }
  } catch (err) {
    logger.warn("SEO cache read failed", { type, slug: entry.slug, error: err.message });
  }

  try {
    const books = await searchGoogleBooks(searchParams(entry, type));
    const trimmed = (books || []).slice(0, MAX_BOOKS);
    const enriched = await amazonAffiliateService.addAffiliateLinksToBooks(trimmed);

    try {
      await redis.set(cacheKey, JSON.stringify(enriched), "EX", CACHE_TTL);
    } catch (err) {
      logger.warn("SEO cache write failed", { type, slug: entry.slug, error: err.message });
    }
    return enriched;
  } catch (err) {
    logger.error("SEO book fetch failed", { type, slug: entry.slug, error: err.message });
    return [];
  }
}

function html(res, body) {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
  res.send(body);
}

class SeoController {
  static async renderGenre(req, res, next) {
    try {
      const entry = GENRE_BY_SLUG[req.params.slug];
      if (!entry) return res.status(404).send("Genre not found");
      const books = await fetchBooks(entry, "genre");
      html(res, renderLandingPage({ type: "genre", entry, books }));
    } catch (err) {
      next(err);
    }
  }

  static async renderTopic(req, res, next) {
    try {
      const entry = TOPIC_BY_SLUG[req.params.slug];
      if (!entry) return res.status(404).send("Topic not found");
      const books = await fetchBooks(entry, "topic");
      html(res, renderLandingPage({ type: "topic", entry, books }));
    } catch (err) {
      next(err);
    }
  }

  static async renderAuthor(req, res, next) {
    try {
      const entry = AUTHOR_BY_SLUG[req.params.slug];
      if (!entry) return res.status(404).send("Author not found");
      const books = await fetchBooks(entry, "author");
      html(res, renderLandingPage({ type: "author", entry, books }));
    } catch (err) {
      next(err);
    }
  }

  static renderHub(req, res) {
    html(res, renderHub());
  }

  static renderSitemap(req, res) {
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.send(renderSitemapXml());
  }

  static renderRobots(req, res) {
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send(renderRobotsTxt());
  }
}

export default SeoController;
