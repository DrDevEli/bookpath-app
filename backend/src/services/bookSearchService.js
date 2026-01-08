import { ApiError } from "../utils/errors.js";
import openLibraryService from "./openLibraryService.js";
import { searchGoogleBooks } from "./googleBooksService.js";
import amazonAffiliateService from "./amazonAffiliateService.js";
import logger from "../config/logger.js";

export default class BookSearchService {
  async search({ title, author, page = 1, category, condition, sort }) {
    // Allow category-only searches
    if (!title && !author && !category) {
      throw new ApiError("At least one search parameter (title, author, or category) must be provided", 400);
    }

    try {
      logger.info("Searching books using multiple APIs", { 
        title, 
        author, 
        category,
        page
      });

      // Map normalized category to search terms for APIs
      const subjectSearchTerm = category ? this.mapCategoryToSubject(category) : null;

      // Fetch from all sources in parallel
      const [openLibResult, googleResult] = await Promise.allSettled([
        openLibraryService.search({ title, author, subject: subjectSearchTerm, page }),
        searchGoogleBooks({ title, author, subject: subjectSearchTerm, page })
      ]);

      // Process results and handle errors gracefully
      let allBooks = [];
      let errors = [];

      // Process Open Library results
      if (openLibResult.status === 'fulfilled') {
        allBooks = allBooks.concat(openLibResult.value.data || []);
        logger.info("Open Library search successful", { 
          resultCount: openLibResult.value.data?.length || 0 
        });
      } else {
        errors.push(`Open Library: ${openLibResult.reason.message}`);
        logger.warn("Open Library search failed", { 
          error: openLibResult.reason.message 
        });
      }

      // Process Google Books results
      if (googleResult.status === 'fulfilled') {
        allBooks = allBooks.concat(googleResult.value || []);
        logger.info("Google Books search successful", { 
          resultCount: googleResult.value?.length || 0 
        });
      } else {
        errors.push(`Google Books: ${googleResult.reason.message}`);
        logger.warn("Google Books search failed", { 
          error: googleResult.reason.message 
        });
      }

      // Normalize categories and condition
      const normalized = allBooks.map((b) => ({
        ...b,
        category: this.normalizeCategory(b.subjects || b.genres || b.category),
        condition: b.condition && (b.condition.toLowerCase() === 'new' || b.condition.toLowerCase() === 'used')
          ? b.condition.toLowerCase()
          : 'unknown',
      }));

      // Apply condition filter (exclude unknown if filter is set)
      let filtered = normalized;
      if (condition === 'new' || condition === 'used') {
        filtered = filtered.filter((b) => b.condition === condition);
      }

      // Apply category filter if provided
      if (category) {
        filtered = filtered.filter((b) => b.category === category);
      }

      // Deduplicate results based on title and author
      const uniqueBooks = this.deduplicateBooks(filtered);

      // Sorting
      const sortedBooks = this.sortBooks(uniqueBooks, sort);

      // Add Amazon affiliate links
      const booksWithAffiliateLinks = await this.addAffiliateLinks(sortedBooks);

      // Calculate pagination
      const totalResults = sortedBooks.length;
      const limit = 20;
      const totalPages = Math.ceil(totalResults / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedBooks = booksWithAffiliateLinks.slice(startIndex, endIndex);

      const result = {
        data: paginatedBooks,
        pagination: {
          currentPage: page,
          totalPages,
          totalResults,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        sources: {
          openLibrary: openLibResult.status === 'fulfilled',
          googleBooks: googleResult.status === 'fulfilled'
        },
        errors: errors.length > 0 ? errors : undefined
      };
      
      logger.info("Aggregated book search completed successfully", { 
        resultCount: paginatedBooks.length,
        totalResults,
        totalPages,
        sourcesUsed: Object.values(result.sources).filter(Boolean).length
      });

      return result;
    } catch (error) {
      logger.error("Book search error", {
        error: error.message,
        title,
        author,
        page
      });

      throw new ApiError(`Book search error: ${error.message}`, 500);
    }
  }

  /**
   * Deduplicate books based on title and author similarity
   */
  deduplicateBooks(books) {
    const seen = new Set();
    const uniqueBooks = [];

    for (const book of books) {
      // Create a key based on normalized title and author
      const normalizedTitle = book.title?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
      const normalizedAuthors = book.authors?.map(a => a.toLowerCase().replace(/[^a-z0-9]/g, '')).join('') || '';
      const key = `${normalizedTitle}-${normalizedAuthors}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueBooks.push(book);
      }
    }

    return uniqueBooks;
  }

  normalizeCategory(raw) {
    if (!raw) return undefined;
    const lower = Array.isArray(raw) ? raw.map((r) => String(r).toLowerCase()) : [String(raw).toLowerCase()];
    const map = [
      { key: 'fiction', val: 'Fiction' },
      { key: 'non-fiction', val: 'Non-fiction' },
      { key: 'nonfiction', val: 'Non-fiction' },
      { key: 'science fiction', val: 'Sci-Fi' },
      { key: 'sci-fi', val: 'Sci-Fi' },
      { key: 'fantasy', val: 'Fantasy' },
      { key: 'mystery', val: 'Mystery' },
      { key: 'romance', val: 'Romance' },
      { key: 'history', val: 'History' },
      { key: 'biography', val: 'Biography' },
      { key: 'self-help', val: 'Self-Help' },
      { key: 'self help', val: 'Self-Help' },
      { key: 'business', val: 'Business' },
      { key: 'technology', val: 'Tech' },
      { key: 'computers', val: 'Tech' },
    ];
    for (const entry of map) {
      if (lower.some((l) => l.includes(entry.key))) return entry.val;
    }
    return undefined;
  }

  /**
   * Map normalized category to subject search terms for APIs
   * @param {string} category - Normalized category (e.g., "History", "Fiction")
   * @returns {string} Subject search term for APIs
   */
  mapCategoryToSubject(category) {
    const categoryMap = {
      'Fiction': 'fiction',
      'Non-fiction': 'nonfiction',
      'Sci-Fi': 'science fiction',
      'Fantasy': 'fantasy',
      'Mystery': 'mystery',
      'Romance': 'romance',
      'History': 'history',
      'Biography': 'biography',
      'Self-Help': 'self-help',
      'Business': 'business',
      'Tech': 'technology',
    };
    return categoryMap[category] || category.toLowerCase();
  }

  sortBooks(books, sort) {
    if (!sort) return books;
    const arr = [...books];
    switch (sort) {
      case 'newest':
        return arr.sort((a, b) => (b.firstPublishYear || 0) - (a.firstPublishYear || 0));
      case 'author_az':
        return arr.sort((a, b) => (a.authors?.[0] || '').localeCompare(b.authors?.[0] || ''));
      default:
        return arr;
    }
  }

  /**
   * Add Amazon affiliate links to books
   */
  async addAffiliateLinks(books) {
    try {
      return await amazonAffiliateService.addAffiliateLinksToBooks(books);
    } catch (error) {
      logger.error("Error adding affiliate links", {
        error: error.message
      });
      
      // Return books without affiliate links if there's an error
      return books.map(book => ({
        ...book,
        amazonLink: null
      }));
    }
  }
}