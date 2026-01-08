import express from "express";
import BookController from "../controllers/bookController.js";
import { rateLimiterMiddleware } from "../middleware/rateLimiter.js";

const router = express.Router();

/**
 * @swagger
 * /books/search:
 *   get:
 *     tags: [Books]
 *     summary: Search books
 *     description: Search for books by title, author, or other criteria
 *     parameters:
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Book title to search for
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: Author name to search for
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: condition
 *         schema:
 *           type: string
 *         description: Filter by condition
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/definitions/Book'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalResults:
 *                       type: integer
 *         headers:
 *           $ref: '#/definitions/RateLimitHeaders'
 *       400:
 *         description: Invalid request - at least one of title or author is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 */
router.get(
  "/search",
  rateLimiterMiddleware,
  BookController.searchBooks
);

/**
 * @swagger
 * /books/advanced:
 *   get:
 *     tags: [Books]
 *     summary: Advanced book search
 *     description: Perform advanced search with multiple criteria (title, author, genre)
 *     parameters:
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Book title to search for
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: Author name to search for
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *         description: Genre to filter by
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: Advanced search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/definitions/Book'
 *                 pagination:
 *                   type: object
 *         headers:
 *           $ref: '#/definitions/RateLimitHeaders'
 *       400:
 *         description: Invalid request - at least one search parameter is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 */
router.get(
  "/advanced",
  rateLimiterMiddleware,
  BookController.advancedSearch
);

/**
 * @swagger
 * /books/category/{category}:
 *   get:
 *     tags: [Books]
 *     summary: Search books by category
 *     description: Discover books in a specific category (e.g., History, Fiction, Science)
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Category name (e.g., History, Fiction, Sci-Fi, Fantasy, Mystery, Romance, Biography, Self-Help, Business, Tech)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: condition
 *         schema:
 *           type: string
 *         description: Filter by condition (new, used)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort order (newest, author_az)
 *     responses:
 *       200:
 *         description: Books in the specified category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/definitions/Book'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalResults:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPreviousPage:
 *                       type: boolean
 *         headers:
 *           $ref: '#/definitions/RateLimitHeaders'
 *       400:
 *         description: Invalid request - category parameter is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 */
router.get(
  "/category/:category",
  rateLimiterMiddleware,
  BookController.searchByCategory
);

/**
 * @swagger
 * /books/author/{authorId}:
 *   get:
 *     tags: [Books]
 *     summary: Get author details
 *     description: Retrieve detailed information about an author by their ID
 *     parameters:
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Author ID (Open Library author ID format)
 *     responses:
 *       200:
 *         description: Author details
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
 *                     name:
 *                       type: string
 *                     bio:
 *                       type: string
 *                     birthDate:
 *                       type: string
 *                     deathDate:
 *                       type: string
 *                     works:
 *                       type: array
 *                       items:
 *                         type: object
 *         headers:
 *           $ref: '#/definitions/RateLimitHeaders'
 *       404:
 *         description: Author not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 */
router.get(
  "/author/:authorId",
  rateLimiterMiddleware,
  BookController.getAuthorDetails
);

/**
 * @swagger
 * /books/{id}/affiliate:
 *   get:
 *     tags: [Books]
 *     summary: Track affiliate click and get affiliate URL
 *     description: Track when a user clicks on an affiliate link and return the affiliate URL for a book
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Book ID
 *     responses:
 *       200:
 *         description: Affiliate URL generated successfully
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
 *                     affiliateUrl:
 *                       type: string
 *                       format: uri
 *                       description: Amazon affiliate link for the book
 *                     bookId:
 *                       type: string
 *         headers:
 *           $ref: '#/definitions/RateLimitHeaders'
 *       404:
 *         description: Book not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 *       500:
 *         description: Affiliate link not available
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 */
router.get(
  "/:id/affiliate",
  rateLimiterMiddleware,
  BookController.trackAffiliateClick
);

/**
 * @swagger
 * /books/{id}:
 *   get:
 *     tags: [Books]
 *     summary: Get book by ID
 *     description: Retrieve detailed information about a specific book by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Book ID (can be MongoDB ID, external ID, or Open Library work ID)
 *     responses:
 *       200:
 *         description: Book details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/definitions/Book'
 *         headers:
 *           $ref: '#/definitions/RateLimitHeaders'
 *       404:
 *         description: Book not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 */
router.get(
  "/:id",
  rateLimiterMiddleware,
  BookController.getBookById
);

export default router;
