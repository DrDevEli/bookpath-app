import express from "express";
import BookController from "../controllers/bookController.js";
import rateLimiterMiddleware from "../middleware/rateLimiter.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /books/search — search books
router.get(
  "/search",
  rateLimiterMiddleware,
  BookController.searchBooks
);

// GET /books/search/advanced — advanced search
router.get(
  "/search/advanced",
  rateLimiterMiddleware,
  BookController.advancedSearch
);

// GET /books/:id — get book by ID
router.get(
  "/:id",
  rateLimiterMiddleware,
  BookController.getBookById
);

// GET /books/author/:authorId — get author details
router.get(
  "/author/:authorId",
  rateLimiterMiddleware,
  BookController.getAuthorDetails
);

// POST /books — add book (example, protected)
router.post(
  "/",
  authMiddleware(),
  (req, res) => {
    res.status(200).json({ success: true, message: "This is a protected route. Only authenticated users can access it." });
  }
);

export default router;
