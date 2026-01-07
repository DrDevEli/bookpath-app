import BookCollection from "../models/BookCollection.js";
import { ApiError } from "../utils/errors.js";
import logger from "../config/logger.js";

class CollectionController {
  static async createCollection(req, res, next) {
    try {
      const { name, description, isPublic, category, color, tags } = req.body;
      const userId = req.user.id;

      if (!name) {
        throw new ApiError(400, "Collection name is required");
      }

      // Check if collection with same name already exists for this user
      const existingCollection = await BookCollection.findOne({
        user: userId,
        name,
      });
      if (existingCollection) {
        throw new ApiError(400, "Collection with this name already exists");
      }

      const newCollection = await BookCollection.create({
        user: userId,
        name,
        description,
        isPublic: !!isPublic,
        category: category || "general",
        color: color || "#3B82F6",
        tags: tags || [],
        books: [],
      });

      // Update stats for empty collection
      newCollection.updateStats();
      await newCollection.save();

      logger.info("Collection created", {
        userId,
        collectionId: newCollection._id,
        category: newCollection.category,
      });

      res.status(201).json({
        success: true,
        data: newCollection,
      });
    } catch (error) {
      logger.error("Collection creation error", {
        userId: req.user?.id,
        error: error.message,
      });
      next(error);
    }
  }

  static async getUserCollections(req, res, next) {
    try {
      const userId = req.user.id;
      const collections = await BookCollection.find({ user: userId });

      res.status(200).json({
        success: true,
        count: collections.length,
        data: collections,
      });
    } catch (error) {
      logger.error("Get collections error", {
        userId: req.user?.id,
        error: error.message,
      });
      next(error);
    }
  }

  static async getCollectionById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const collection = await BookCollection.findOne({
        _id: id,
        $or: [{ user: userId }, { isPublic: true }],
      });

      if (!collection) {
        throw new ApiError(404, "Collection not found or access denied");
      }

      res.status(200).json({
        success: true,
        data: collection,
      });
    } catch (error) {
      logger.error("Get collection by ID error", {
        userId: req.user?.id,
        collectionId: req.params.id,
        error: error.message,
      });
      next(error);
    }
  }

  static async addBookToCollection(req, res, next) {
    try {
      const { collectionId } = req.params;
      const { 
        bookId, 
        title, 
        authors, 
        coverImage, 
        publisher,
        publishedDate,
        pageCount,
        isbn,
        language,
        genres,
        notes, 
        readStatus,
        rating,
        dateStarted,
        dateFinished,
        progress,
        favorite,
        personalTags
      } = req.body;
      const userId = req.user.id;

      if (!bookId || !title) {
        throw new ApiError(400, "Book ID and title are required");
      }

      const collection = await BookCollection.findOne({
        _id: collectionId,
        user: userId,
      });
      if (!collection) {
        throw new ApiError(404, "Collection not found or access denied");
      }

      // Check if book already exists in collection
      const bookExists = collection.books.some(
        (book) => book.bookId === bookId
      );
      if (bookExists) {
        throw new ApiError(400, "Book already exists in this collection");
      }

      const bookData = {
        bookId,
        title,
        authors: authors || [],
        coverImage,
        publisher,
        publishedDate,
        pageCount,
        isbn,
        language,
        genres: genres || [],
        notes,
        readStatus: readStatus || "to-read",
        rating,
        dateStarted,
        dateFinished,
        progress: progress || 0,
        favorite: favorite || false,
        personalTags: personalTags || [],
      };

      collection.books.push(bookData);
      collection.updateStats();
      await collection.save();

      logger.info("Book added to collection", {
        userId,
        collectionId,
        bookId,
      });

      res.status(200).json({
        success: true,
        data: collection,
      });
    } catch (error) {
      logger.error("Add book to collection error", {
        userId: req.user?.id,
        collectionId: req.params.collectionId,
        error: error.message,
      });
      next(error);
    }
  }

  static async updateBookInCollection(req, res, next) {
    try {
      const { collectionId, bookId } = req.params;
      const { 
        notes, 
        rating, 
        readStatus, 
        dateStarted, 
        dateFinished, 
        progress, 
        favorite, 
        personalTags 
      } = req.body;
      const userId = req.user.id;

      const collection = await BookCollection.findOne({
        _id: collectionId,
        user: userId,
      });
      if (!collection) {
        throw new ApiError(404, "Collection not found or access denied");
      }

      const bookIndex = collection.books.findIndex(
        (book) => book.bookId === bookId
      );
      if (bookIndex === -1) {
        throw new ApiError(404, "Book not found in collection");
      }

      // Update only the provided fields
      if (notes !== undefined) collection.books[bookIndex].notes = notes;
      if (rating !== undefined) collection.books[bookIndex].rating = rating;
      if (readStatus !== undefined) collection.books[bookIndex].readStatus = readStatus;
      if (dateStarted !== undefined) collection.books[bookIndex].dateStarted = dateStarted;
      if (dateFinished !== undefined) collection.books[bookIndex].dateFinished = dateFinished;
      if (progress !== undefined) collection.books[bookIndex].progress = progress;
      if (favorite !== undefined) collection.books[bookIndex].favorite = favorite;
      if (personalTags !== undefined) collection.books[bookIndex].personalTags = personalTags;

      // Update collection stats
      collection.updateStats();
      await collection.save();

      logger.info("Book updated in collection", {
        userId,
        collectionId,
        bookId,
      });

      res.status(200).json({
        success: true,
        data: collection,
      });
    } catch (error) {
      logger.error("Update book in collection error", {
        userId: req.user?.id,
        collectionId: req.params.collectionId,
        bookId: req.params.bookId,
        error: error.message,
      });
      next(error);
    }
  }

  static async removeBookFromCollection(req, res, next) {
    try {
      const { collectionId, bookId } = req.params;
      const userId = req.user.id;

      const collection = await BookCollection.findOne({
        _id: collectionId,
        user: userId,
      });
      if (!collection) {
        throw new ApiError(404, "Collection not found or access denied");
      }

      const bookIndex = collection.books.findIndex(
        (book) => book.bookId === bookId
      );
      if (bookIndex === -1) {
        throw new ApiError(404, "Book not found in collection");
      }

      collection.books.splice(bookIndex, 1);
      collection.updateStats();
      await collection.save();

      logger.info("Book removed from collection", {
        userId,
        collectionId,
        bookId,
      });

      res.status(200).json({
        success: true,
        message: "Book removed from collection",
        data: collection,
      });
    } catch (error) {
      logger.error("Remove book from collection error", {
        userId: req.user?.id,
        collectionId: req.params.collectionId,
        bookId: req.params.bookId,
        error: error.message,
      });
      next(error);
    }
  }

  static async updateCollection(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, isPublic, category, color, tags, sortBy, sortOrder } = req.body;
      const userId = req.user.id;

      const collection = await BookCollection.findOne({
        _id: id,
        user: userId,
      });

      if (!collection) {
        throw new ApiError(404, "Collection not found or access denied");
      }

      // Update fields if provided
      if (name !== undefined) collection.name = name;
      if (description !== undefined) collection.description = description;
      if (isPublic !== undefined) collection.isPublic = isPublic;
      if (category !== undefined) collection.category = category;
      if (color !== undefined) collection.color = color;
      if (tags !== undefined) collection.tags = tags;
      if (sortBy !== undefined) collection.sortBy = sortBy;
      if (sortOrder !== undefined) collection.sortOrder = sortOrder;

      await collection.save();

      logger.info("Collection updated", {
        userId,
        collectionId: id,
      });

      res.status(200).json({
        success: true,
        data: collection,
      });
    } catch (error) {
      logger.error("Update collection error", {
        userId: req.user?.id,
        collectionId: req.params.id,
        error: error.message,
      });
      next(error);
    }
  }

  static async deleteCollection(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const collection = await BookCollection.findOne({
        _id: id,
        user: userId,
      });

      if (!collection) {
        throw new ApiError(404, "Collection not found or access denied");
      }

      await BookCollection.deleteOne({ _id: id });

      logger.info("Collection deleted", {
        userId,
        collectionId: id,
      });

      res.status(200).json({
        success: true,
        message: "Collection deleted successfully",
      });
    } catch (error) {
      logger.error("Delete collection error", {
        userId: req.user?.id,
        collectionId: req.params.id,
        error: error.message,
      });
      next(error);
    }
  }

  static async getCollectionsByCategory(req, res, next) {
    try {
      const { category } = req.params;
      const userId = req.user.id;

      const collections = await BookCollection.find({
        user: userId,
        category,
      });

      res.status(200).json({
        success: true,
        count: collections.length,
        data: collections,
      });
    } catch (error) {
      logger.error("Get collections by category error", {
        userId: req.user?.id,
        category: req.params.category,
        error: error.message,
      });
      next(error);
    }
  }

  static async generateShareableLink(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const collection = await BookCollection.findOne({
        _id: id,
        user: userId,
      });

      if (!collection) {
        throw new ApiError(404, "Collection not found or access denied");
      }

      const shareableLink = collection.generateShareableLink();
      await collection.save();

      logger.info("Shareable link generated", {
        userId,
        collectionId: id,
      });

      res.status(200).json({
        success: true,
        data: {
          shareableLink,
          shareableUrl: `${req.protocol}://${req.get('host')}/shared/${shareableLink}`,
        },
      });
    } catch (error) {
      logger.error("Generate shareable link error", {
        userId: req.user?.id,
        collectionId: req.params.id,
        error: error.message,
      });
      next(error);
    }
  }

  static async getSharedCollection(req, res, next) {
    try {
      const { shareableLink } = req.params;

      const collection = await BookCollection.findOne({
        shareableLink,
        isPublic: true,
      }).populate('user', 'username email');

      if (!collection) {
        throw new ApiError(404, "Shared collection not found or not public");
      }

      res.status(200).json({
        success: true,
        data: collection,
      });
    } catch (error) {
      logger.error("Get shared collection error", {
        shareableLink: req.params.shareableLink,
        error: error.message,
      });
      next(error);
    }
  }

  static async getCollectionStats(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const collection = await BookCollection.findOne({
        _id: id,
        $or: [{ user: userId }, { isPublic: true }],
      });

      if (!collection) {
        throw new ApiError(404, "Collection not found or access denied");
      }

      // Update stats before returning
      collection.updateStats();
      await collection.save();

      const readingStats = {
        toRead: collection.getBooksByStatus('to-read').length,
        reading: collection.getBooksByStatus('reading').length,
        completed: collection.getBooksByStatus('completed').length,
        abandoned: collection.getBooksByStatus('abandoned').length,
        dnf: collection.getBooksByStatus('dnf').length,
      };

      const favoriteBooks = collection.getFavoriteBooks();

      res.status(200).json({
        success: true,
        data: {
          basic: collection.stats,
          readingStats,
          favoriteCount: favoriteBooks.length,
          genreDistribution: this.getGenreDistribution(collection.books),
          readingProgress: this.getReadingProgress(collection.books),
        },
      });
    } catch (error) {
      logger.error("Get collection stats error", {
        userId: req.user?.id,
        collectionId: req.params.id,
        error: error.message,
      });
      next(error);
    }
  }

  static async searchBooks(req, res, next) {
    try {
      const { id } = req.params;
      const { query, status, genre, favorite } = req.query;
      const userId = req.user.id;

      const collection = await BookCollection.findOne({
        _id: id,
        $or: [{ user: userId }, { isPublic: true }],
      });

      if (!collection) {
        throw new ApiError(404, "Collection not found or access denied");
      }

      let books = collection.books;

      // Apply filters
      if (query) {
        const searchTerm = query.toLowerCase();
        books = books.filter(book => 
          book.title.toLowerCase().includes(searchTerm) ||
          book.authors.some(author => author.toLowerCase().includes(searchTerm)) ||
          book.notes?.toLowerCase().includes(searchTerm)
        );
      }

      if (status) {
        books = books.filter(book => book.readStatus === status);
      }

      if (genre) {
        books = books.filter(book => 
          book.genres && book.genres.some(g => g.toLowerCase().includes(genre.toLowerCase()))
        );
      }

      if (favorite === 'true') {
        books = books.filter(book => book.favorite);
      }

      res.status(200).json({
        success: true,
        count: books.length,
        data: books,
      });
    } catch (error) {
      logger.error("Search books in collection error", {
        userId: req.user?.id,
        collectionId: req.params.id,
        error: error.message,
      });
      next(error);
    }
  }

  // Helper methods
  static getGenreDistribution(books) {
    const genreCount = {};
    books.forEach(book => {
      if (book.genres) {
        book.genres.forEach(genre => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
      }
    });
    return genreCount;
  }

  static getReadingProgress(books) {
    const monthlyProgress = {};
    books.forEach(book => {
      if (book.dateFinished) {
        const month = book.dateFinished.toISOString().slice(0, 7); // YYYY-MM
        monthlyProgress[month] = (monthlyProgress[month] || 0) + 1;
      }
    });
    return monthlyProgress;
  }
}

export default CollectionController;
