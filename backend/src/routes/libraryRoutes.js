import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { rateLimiterMiddleware } from "../middleware/rateLimiter.js";
import { ApiError } from "../utils/errors.js";
import logger from "../config/logger.js";
import libraryService from "../services/libraryService.js";

const router = express.Router();

/**
 * @swagger
 * /library:
 *   get:
 *     tags: [Library]
 *     summary: Get user's aggregated library
 *     description: Returns all user books organized into shelves and computed stats
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregated library with shelves and stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     shelves:
 *                       type: object
 *                       properties:
 *                         wantToRead:
 *                           type: array
 *                         currentlyReading:
 *                           type: array
 *                         completed:
 *                           type: array
 *                         favorites:
 *                           type: array
 *                         abandoned:
 *                           type: array
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalBooks:
 *                           type: integer
 *                         completedBooks:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         averageRating:
 *                           type: number
 *                         topAuthors:
 *                           type: array
 *                         topGenres:
 *                           type: array
 *                         readingStreak:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/",
  authMiddleware(),
  rateLimiterMiddleware,
  async (req, res, next) => {
    try {
      const userId = req.user.id;

      logger.info("GET /api/library", { userId });

      const library = await libraryService.getLibrary(userId);

      res.status(200).json({
        success: true,
        data: library,
      });
    } catch (error) {
      logger.error("GET /api/library error", {
        userId: req.user?.id,
        error: error.message,
      });
      next(error);
    }
  }
);

/**
 * @swagger
 * /library/stats:
 *   get:
 *     tags: [Library]
 *     summary: Get library statistics only
 *     description: Returns computed stats for the user's library
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Library statistics
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/stats",
  authMiddleware(),
  rateLimiterMiddleware,
  async (req, res, next) => {
    try {
      const userId = req.user.id;

      logger.info("GET /api/library/stats", { userId });

      const stats = await libraryService.getLibraryStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("GET /api/library/stats error", {
        userId: req.user?.id,
        error: error.message,
      });
      next(error);
    }
  }
);

/**
 * @swagger
 * /library/books:
 *   post:
 *     tags: [Library]
 *     summary: Add a book to the user's library
 *     description: Add a book to the default library with a shelf designation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - book
 *             properties:
 *               book:
 *                 type: object
 *                 required:
 *                   - bookId
 *                   - title
 *                 properties:
 *                   bookId:
 *                     type: string
 *                   title:
 *                     type: string
 *                   authors:
 *                     type: array
 *                     items:
 *                       type: string
 *                   coverImage:
 *                     type: string
 *                   pageCount:
 *                     type: integer
 *                   genres:
 *                     type: array
 *                     items:
 *                       type: string
 *               shelf:
 *                 type: string
 *                 enum: [wantToRead, reading, completed]
 *                 default: wantToRead
 *     responses:
 *       200:
 *         description: Book added successfully
 *       400:
 *         description: Book already exists or invalid data
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/books",
  authMiddleware(),
  rateLimiterMiddleware,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { book, shelf } = req.body;

      if (!book) {
        throw new ApiError("Book data is required", 400);
      }

      logger.info("POST /api/library/books", {
        userId,
        bookId: book.bookId,
        shelf,
      });

      const addedBook = await libraryService.addToLibrary(userId, book, shelf);

      res.status(201).json({
        success: true,
        data: addedBook,
      });
    } catch (error) {
      logger.error("POST /api/library/books error", {
        userId: req.user?.id,
        error: error.message,
      });
      next(error);
    }
  }
);

/**
 * @swagger
 * /library/books/{bookId}:
 *   put:
 *     tags: [Library]
 *     summary: Update a book's status, progress, or rating
 *     description: Update readStatus, progress, rating, favorite, etc. for a book in the library
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: string
 *         description: The book ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               readStatus:
 *                 type: string
 *                 enum: [wantToRead, reading, completed, abandoned]
 *               progress:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               favorite:
 *                 type: boolean
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Book updated successfully
 *       404:
 *         description: Book not found
 *       401:
 *         description: Unauthorized
 */
router.put(
  "/books/:bookId",
  authMiddleware(),
  rateLimiterMiddleware,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { bookId } = req.params;
      const updates = req.body;

      if (Object.keys(updates).length === 0) {
        throw new ApiError("At least one update field is required", 400);
      }

      logger.info("PUT /api/library/books/:bookId", {
        userId,
        bookId,
        updates: Object.keys(updates),
      });

      const updatedBook = await libraryService.updateBookStatus(
        userId,
        bookId,
        updates
      );

      res.status(200).json({
        success: true,
        data: updatedBook,
      });
    } catch (error) {
      logger.error("PUT /api/library/books/:bookId error", {
        userId: req.user?.id,
        bookId: req.params.bookId,
        error: error.message,
      });
      next(error);
    }
  }
);

/**
 * @swagger
 * /library/books/{bookId}:
 *   delete:
 *     tags: [Library]
 *     summary: Remove a book from the library
 *     description: Remove a book from all of the user's collections
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: string
 *         description: The book ID
 *     responses:
 *       200:
 *         description: Book removed successfully
 *       404:
 *         description: Book not found
 *       401:
 *         description: Unauthorized
 */
router.delete(
  "/books/:bookId",
  authMiddleware(),
  rateLimiterMiddleware,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { bookId } = req.params;

      logger.info("DELETE /api/library/books/:bookId", { userId, bookId });

      const result = await libraryService.removeFromLibrary(userId, bookId);

      res.status(200).json({
        success: true,
        message: "Book removed from library",
        data: result,
      });
    } catch (error) {
      logger.error("DELETE /api/library/books/:bookId error", {
        userId: req.user?.id,
        bookId: req.params.bookId,
        error: error.message,
      });
      next(error);
    }
  }
);

export default router;
