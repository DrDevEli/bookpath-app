import BookSearchService from "../services/bookSearchService.js";
import advancedSearchService from "../services/advancedSearchService.js";
import openLibraryService from "../services/openLibraryService.js";
import amazonAffiliateService from "../services/amazonAffiliateService.js";
import { ApiError } from "../utils/errors.js";
import redis from "../config/redis.js";
import logger from "../config/logger.js";
import Book from "../models/Book.js";
import mongoose from "mongoose";

class BookController {
  static async searchBooks(req, res, next) {
    try {
      const { title, author, page = 1, category, condition, sort } = req.query;
      // Allow category-only searches
      if (!title && !author && !category) {
        throw new ApiError('At least one of "title", "author", or "category" is required', 400);
      }

      const cacheKey = `search:${title || ''}:${author || ''}:${category || ''}:${condition || ''}:${sort || ''}:${page}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return res.json({ success: true, ...parsed });
      }

      const result = await new BookSearchService().search({
        title,
        author,
        page: parseInt(page),
        category: category || undefined,
        condition: condition || undefined,
        sort: sort || undefined,
      });
      await redis.set(cacheKey, JSON.stringify(result), "EX", 3600); // cache 1 hour
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async advancedSearch(req, res, next) {
    try {
      const { title, author, genre, page = 1 } = req.query;
      if (!title && !author && !genre) {
        throw new ApiError(400, "At least one search parameter is required");
      }
      const result = await advancedSearchService.advancedSearch({
        title,
        author,
        genre,
        page: parseInt(page),
      });
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error("Advanced search error", { error: error.message });
      next(error);
    }
  }

  static async getBookById(req, res, next) {
    try {
      const { id } = req.params;
      
      logger.info("Fetching book by ID", { bookId: id });
      
      // Handle featured book IDs (frontend-generated IDs like "featured-2")
      if (id.startsWith('featured-')) {
        logger.warn("Featured book ID requested - these are frontend-only IDs", { bookId: id });
        return res.status(404).json({ 
          success: false, 
          error: "Featured books are display-only. Please search for the book to view details.",
          message: "Featured books are display-only. Please search for the book to view details."
        });
      }
      
      // Check if ID is from Google Books (we don't support details for Google Books yet)
      if (id.startsWith('google-')) {
        logger.warn("Book details requested for Google Books source", { bookId: id });
        return res.status(404).json({ 
          success: false, 
          error: "Book details not available for Google Books. Please use search to find books.",
          message: "Book details not available for Google Books. Please use search to find books."
        });
      }
      
      // Only try MongoDB findById if ID is a valid ObjectId
      const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
      if (isValidObjectId) {
        let book = await Book.findById(id);
        if (book) {
          // Add affiliate link if not already present
          if (!book.amazonLink) {
            const amazonLink = await amazonAffiliateService.generateAffiliateLink({
              title: book.title,
              authors: book.authors || []
            });
            book = { ...book.toObject(), amazonLink };
          }
          return res.status(200).json({ success: true, data: book });
        }
      }
      
      // If not found locally, try to find by externalId
      let book = await Book.findOne({ externalId: id });
      if (book) {
        // Add affiliate link if not already present
        if (!book.amazonLink) {
          const amazonLink = await amazonAffiliateService.generateAffiliateLink({
            title: book.title,
            authors: book.authors || []
          });
          book = { ...book.toObject(), amazonLink };
        }
        return res.status(200).json({ success: true, data: book });
      }
      
      // Only try Open Library if ID looks like an Open Library work ID
      // Open Library IDs typically: OL + numbers + letter (e.g., OL4322177W) or /works/OL...
      const isOpenLibraryId = id.startsWith('OL') || 
                              id.startsWith('/works/') || 
                              /^OL[A-Z0-9]+[A-Z]$/i.test(id); // Pattern: OL + alphanumeric + letter
      
      if (!isOpenLibraryId) {
        logger.warn("Invalid book ID format", { bookId: id });
        return res.status(404).json({ 
          success: false, 
          error: "Book not found. Invalid book ID format.",
          message: "Book not found. Invalid book ID format."
        });
      }
      
      try {
        // Check if the ID looks like an Open Library work ID
        let workId = id;
        if (!workId.startsWith('/works/')) {
          workId = `/works/${workId}`;
        }
        
        const openLibraryBook = await openLibraryService.getBookDetails(workId);
        
        // Add Amazon affiliate link
        const amazonLink = await amazonAffiliateService.generateAffiliateLink({
          title: openLibraryBook.title,
          authors: openLibraryBook.authorNames || []
        });
        
        const bookWithAffiliate = {
          ...openLibraryBook,
          amazonLink
        };
        
        // Optionally save to local database for future use
        try {
          const newBook = new Book({
            title: openLibraryBook.title,
            authors: openLibraryBook.authorNames,
            description: openLibraryBook.description,
            coverImage: openLibraryBook.coverImage,
            externalId: openLibraryBook.id,
            openLibraryKey: openLibraryBook.openLibraryKey,
            firstPublishYear: openLibraryBook.firstPublishYear,
            subjects: openLibraryBook.subjects
          });
          
          await newBook.save();
        } catch (saveError) {
          // Don't fail if save fails, just log it
          logger.warn("Failed to save book to database", { error: saveError.message, bookId: id });
        }
        
        return res.status(200).json({ success: true, data: bookWithAffiliate });
      } catch (openLibraryError) {
        logger.error("Error fetching from Open Library", { 
          error: openLibraryError.message, 
          bookId: id,
          stack: openLibraryError.stack
        });
        
        // If Open Library also fails, return not found with helpful message
        const errorMessage = openLibraryError.response?.status === 404 
          ? "Book not found in Open Library. The book may have been removed or the ID is invalid."
          : openLibraryError.message || "Book not found in local database or Open Library";
        
        return res.status(404).json({ 
          success: false, 
          error: errorMessage,
          message: errorMessage
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search books by category only
   */
  static async searchByCategory(req, res, next) {
    try {
      const { category } = req.params;
      const { page = 1, condition, sort } = req.query;

      if (!category) {
        throw new ApiError("Category parameter is required", 400);
      }

      logger.info("Searching books by category", { category, page });

      const cacheKey = `category:${category}:${condition || ''}:${sort || ''}:${page}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return res.json({ success: true, ...parsed });
      }

      const result = await new BookSearchService().search({
        category,
        page: parseInt(page),
        condition: condition || undefined,
        sort: sort || undefined,
      });

      await redis.set(cacheKey, JSON.stringify(result), "EX", 3600); // cache 1 hour
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getAuthorDetails(req, res, next) {
    try {
      const { authorId } = req.params;
      
      // Check if the ID looks like an Open Library author ID
      let authorKey = authorId;
      if (!authorKey.startsWith('/authors/')) {
        authorKey = `/authors/${authorKey}`;
      }
      
      const authorDetails = await openLibraryService.getAuthorDetails(authorKey);
      res.status(200).json({ success: true, data: authorDetails });
    } catch (error) {
      logger.error("Error fetching author details", { error: error.message });
      next(error);
    }
  }

  /**
   * Track affiliate link click and return affiliate URL
   */
  static async trackAffiliateClick(req, res, next) {
    try {
      const { id } = req.params;
      
      // Get book details
      let book = await Book.findById(id);
      if (!book) {
        book = await Book.findOne({ externalId: id });
      }
      
      // If book not in DB, fetch from Open Library
      if (!book) {
        let workId = id;
        if (!workId.startsWith('/works/')) {
          workId = `/works/${workId}`;
        }
        const openLibraryBook = await openLibraryService.getBookDetails(workId);
        book = {
          title: openLibraryBook.title,
          authors: openLibraryBook.authorNames || []
        };
      }
      
      // Generate affiliate link
      const amazonLink = await amazonAffiliateService.generateAffiliateLink({
        title: book.title,
        authors: book.authors || []
      });
      
      // Log the click (optional: store in database for analytics)
      logger.info("Affiliate link clicked", {
        bookId: id,
        bookTitle: book.title,
        timestamp: new Date().toISOString()
      });
      
      if (!amazonLink) {
        throw new ApiError(500, "Affiliate link not available");
      }
      
      res.status(200).json({
        success: true,
        data: {
          affiliateUrl: amazonLink,
          bookId: id
        }
      });
    } catch (error) {
      logger.error("Error tracking affiliate click", { error: error.message });
      next(error);
    }
  }
}

export default BookController;
