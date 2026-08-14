import express from "express";
import SeoController from "../controllers/seoController.js";

/**
 * SEO landing-page routes. Mounted at the root (NOT under /api) so the URLs are
 * clean and crawlable:
 *   /books/genre/:slug     e.g. /books/genre/fantasy
 *   /books/topic/:slug     e.g. /books/topic/best-sci-fi-books
 *   /books/author/:slug    e.g. /books/author/brandon-sanderson
 *   /seo                   internal-linking hub
 *   /sitemap.xml           programmatic sitemap
 *   /robots.txt            crawler directives
 */
const router = express.Router();

router.get("/books/genre/:slug", SeoController.renderGenre);
router.get("/books/topic/:slug", SeoController.renderTopic);
router.get("/books/author/:slug", SeoController.renderAuthor);

router.get("/seo", SeoController.renderHub);
router.get("/sitemap.xml", SeoController.renderSitemap);
router.get("/robots.txt", SeoController.renderRobots);

export default router;
