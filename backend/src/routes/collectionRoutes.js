import express from "express";
import CollectionController from "../controllers/collectionController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { rateLimiterMiddleware } from "../middleware/rateLimiter.js";
import {
  validateCreateCollection,
  validateUpdateCollection,
  validateAddBookToCollection,
  validateUpdateBookInCollection,
  validateSearchBooksInCollection,
} from "../middleware/validateRequest.js";

const router = express.Router();

/**
 * @swagger
 * /collections:
 *   post:
 *     tags: [Collections]
 *     summary: Create a new collection
 *     description: Create a new book collection
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: My Favorite Books
 *               description:
 *                 type: string
 *                 example: A collection of my favorite books
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Collection created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/BookCollection'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 */
router.post(
  "/",
  authMiddleware(),
  rateLimiterMiddleware,
  validateCreateCollection,
  CollectionController.createCollection
);

/**
 * @swagger
 * /collections:
 *   get:
 *     tags: [Collections]
 *     summary: Get user's collections
 *     description: Retrieve all collections for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of collections
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/PaginatedResponse'
 *         headers:
 *           $ref: '#/definitions/RateLimitHeaders'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 */
router.get(
  "/",
  authMiddleware(),
  rateLimiterMiddleware,
  CollectionController.getUserCollections
);

/**
 * @swagger
 * /collections/{id}:
 *   get:
 *     tags: [Collections]
 *     summary: Get collection details
 *     description: Retrieve detailed information about a specific collection
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection ID
 *     responses:
 *       200:
 *         description: Collection details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/BookCollection'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Collection not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 */
router.get(
  "/:id",
  authMiddleware(),
  rateLimiterMiddleware,
  CollectionController.getCollectionById
);

/**
 * @swagger
 * /collections/{id}:
 *   put:
 *     tags: [Collections]
 *     summary: Update collection
 *     description: Update collection details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *               category:
 *                 type: string
 *               color:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Collection updated successfully
 *       404:
 *         description: Collection not found
 */
router.put(
  "/:id",
  authMiddleware(),
  rateLimiterMiddleware,
  validateUpdateCollection,
  CollectionController.updateCollection
);

/**
 * @swagger
 * /collections/{id}:
 *   delete:
 *     tags: [Collections]
 *     summary: Delete collection
 *     description: Delete a collection
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection ID
 *     responses:
 *       200:
 *         description: Collection deleted successfully
 *       404:
 *         description: Collection not found
 */
router.delete(
  "/:id",
  authMiddleware(),
  rateLimiterMiddleware,
  CollectionController.deleteCollection
);

/**
 * @swagger
 * /collections/category/{category}:
 *   get:
 *     tags: [Collections]
 *     summary: Get collections by category
 *     description: Get all collections for a specific category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection category
 *     responses:
 *       200:
 *         description: Collections retrieved successfully
 */
router.get(
  "/category/:category",
  authMiddleware(),
  rateLimiterMiddleware,
  CollectionController.getCollectionsByCategory
);

/**
 * @swagger
 * /collections/{id}/share:
 *   post:
 *     tags: [Collections]
 *     summary: Generate shareable link
 *     description: Generate a shareable link for a collection
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection ID
 *     responses:
 *       200:
 *         description: Shareable link generated
 */
router.post(
  "/:id/share",
  authMiddleware(),
  rateLimiterMiddleware,
  CollectionController.generateShareableLink
);

/**
 * @swagger
 * /collections/{id}/stats:
 *   get:
 *     tags: [Collections]
 *     summary: Get collection statistics
 *     description: Get detailed statistics for a collection
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection ID
 *     responses:
 *       200:
 *         description: Collection statistics
 */
router.get(
  "/:id/stats",
  authMiddleware(),
  rateLimiterMiddleware,
  CollectionController.getCollectionStats
);

/**
 * @swagger
 * /collections/{id}/search:
 *   get:
 *     tags: [Collections]
 *     summary: Search books in collection
 *     description: Search and filter books within a collection
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection ID
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by read status
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *         description: Filter by genre
 *       - in: query
 *         name: favorite
 *         schema:
 *           type: boolean
 *         description: Filter favorites only
 *     responses:
 *       200:
 *         description: Search results
 */
router.get(
  "/:id/search",
  authMiddleware(),
  rateLimiterMiddleware,
  validateSearchBooksInCollection,
  CollectionController.searchBooks
);

// Book management in collections
router.post(
  "/:collectionId/books",
  authMiddleware(),
  rateLimiterMiddleware,
  validateAddBookToCollection,
  CollectionController.addBookToCollection
);

router.put(
  "/:collectionId/books/:bookId",
  authMiddleware(),
  rateLimiterMiddleware,
  validateUpdateBookInCollection,
  CollectionController.updateBookInCollection
);

router.delete(
  "/:collectionId/books/:bookId",
  authMiddleware(),
  rateLimiterMiddleware,
  CollectionController.removeBookFromCollection
);

// Public shared collection route (no auth required)
router.get(
  "/shared/:shareableLink",
  rateLimiterMiddleware,
  CollectionController.getSharedCollection
);

export default router;
