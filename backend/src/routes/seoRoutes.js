import express from "express";
import BookCollection from "../models/BookCollection.js";

const router = express.Router();

// GET /seo/collections/:shareableLink — SEO-optimized HTML for public collections
router.get("/collections/:shareableLink", async (req, res, next) => {
  try {
    const { shareableLink } = req.params;
    const collection = await BookCollection.findOne({
      shareableLink,
      isPublic: true,
    }).lean();

    if (!collection) {
      return res.status(404).send("Not found");
    }

    const title = `${collection.name} — BookPath Collection`;
    const description = collection.description || "Explore this curated book collection on BookPath.";
    const image = collection.coverImage || `${process.env.FRONTEND_URL}/bookpath_logo_bordered_golden_updated.webp`;
    const canonicalUrl = `${process.env.FRONTEND_URL}/collections/shared/${shareableLink}`;

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
</head>
<body>
  <main>
    <h1>${collection.name}</h1>
    <p>${description}</p>
    <p>View this collection on BookPath: <a href="${canonicalUrl}">${canonicalUrl}</a></p>
  </main>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    next(err);
  }
});

export default router;


