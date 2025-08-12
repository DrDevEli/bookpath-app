import BookSearchService from "../services/bookSearchService.js";
import advancedSearchService from "../services/searchAdvanceService.js";
import openLibraryService from "../services/openLibraryService.js";
import { ApiError } from "../utils/errors.js";
import redis from "../config/redis.js";
import logger from "../config/logger.js";
import Book from "../models/Book.js";

class BookController {
  static async searchBooks(req, res, next) {
    try {
      const { title, author, page = 1, category, condition, sort } = req.query;
      if (!title && !author) throw new ApiError(400, 'At least one of "title" or "author" is required');

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
      // Check if user has pro subscription
      if (req.user.subscriptionTier !== "pro") {
        throw new ApiError(402, "Pro subscription required for advanced search");
      }

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
      
      // Try to find the book in the local database first
      let book = await Book.findById(id);
      if (book) {
        return res.status(200).json({ success: true, data: book });
      }
      
      // If not found locally, try to find by externalId
      book = await Book.findOne({ externalId: id });
      if (book) {
        return res.status(200).json({ success: true, data: book });
      }
      
      // If not found locally, try to fetch from Open Library
      try {
        // Check if the ID looks like an Open Library work ID
        let workId = id;
        if (!workId.startsWith('/works/')) {
          workId = `/works/${workId}`;
        }
        
        const openLibraryBook = await openLibraryService.getBookDetails(workId);
        
        // Optionally save to local database for future use
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
        
        return res.status(200).json({ success: true, data: openLibraryBook });
      } catch (openLibraryError) {
        logger.error("Error fetching from Open Library", { 
          error: openLibraryError.message, 
          bookId: id 
        });
        
        // If Open Library also fails, return not found
        return res.status(404).json({ 
          success: false, 
          message: "Book not found in local database or Open Library" 
        });
      }
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
}

export default BookController;
