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
import { fetchBooksForEntry } from "../services/seoBookFetcher.js";

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
      const books = await fetchBooksForEntry(entry, "genre");
      html(res, renderLandingPage({ type: "genre", entry, books }));
    } catch (err) {
      next(err);
    }
  }

  static async renderTopic(req, res, next) {
    try {
      const entry = TOPIC_BY_SLUG[req.params.slug];
      if (!entry) return res.status(404).send("Topic not found");
      const books = await fetchBooksForEntry(entry, "topic");
      html(res, renderLandingPage({ type: "topic", entry, books }));
    } catch (err) {
      next(err);
    }
  }

  static async renderAuthor(req, res, next) {
    try {
      const entry = AUTHOR_BY_SLUG[req.params.slug];
      if (!entry) return res.status(404).send("Author not found");
      const books = await fetchBooksForEntry(entry, "author");
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
