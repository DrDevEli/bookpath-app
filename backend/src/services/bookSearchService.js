import { ApiError } from "../utils/errors.js";
import openLibraryService from "./openLibraryService.js";
import { searchGutendex } from "./gutendexService.js";
import { searchGoogleBooks } from "./googleBooksService.js";
import amazonAffiliateService from "./amazonAffiliateService.js";
import booklookerService from "./bookLookerService.js";
import logger from "../config/logger.js";

export default class BookSearchService {
  async search({ title, author, page = 1, category, condition, sort }) {
    if (!title && !author) {
      throw new ApiError(400, "At least one search parameter must be provided");
    }

    try {
      logger.info("Searching books using multiple APIs", { 
        title, 
        author, 
        page
      });

      // Fetch from all sources in parallel
      const [openLibResult, gutendexResult, googleResult, booklookerResult] = await Promise.allSettled([
        openLibraryService.search({ title, author, page }),
        searchGutendex({ title, author, page }),
        searchGoogleBooks({ title, author, page }),
        booklookerService.searchBooklooker({ title, author, page })
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

      // Process Gutendex results
      if (gutendexResult.status === 'fulfilled') {
        allBooks = allBooks.concat(gutendexResult.value || []);
        logger.info("Gutendex search successful", { 
          resultCount: gutendexResult.value?.length || 0 
        });
      } else {
        errors.push(`Gutendex: ${gutendexResult.reason.message}`);
        logger.warn("Gutendex search failed", { 
          error: gutendexResult.reason.message 
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

      // Process Booklooker results
      if (booklookerResult.status === 'fulfilled') {
        allBooks = allBooks.concat(booklookerResult.value || []);
        logger.info("Booklooker search successful", { 
          resultCount: booklookerResult.value?.length || 0 
        });
      } else {
        errors.push(`Booklooker: ${booklookerResult.reason.message}`);
        logger.warn("Booklooker search failed", { 
          error: booklookerResult.reason.message 
        });
      }

      // Normalize categories and condition
      const normalized = allBooks.map((b) => ({
        ...b,
        category: this.normalizeCategory(b.subjects || b.genres || b.category),
        condition: b.condition && (b.condition.toLowerCase() === 'new' || b.condition.toLowerCase() === 'used')
          ? b.condition.toLowerCase()
          : (b.source === 'booklooker' ? (b.condition?.toLowerCase() || 'unknown') : 'unknown'),
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

      // Deduplicate results using stable identifiers where possible
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
          gutendex: gutendexResult.status === 'fulfilled',
          googleBooks: googleResult.status === 'fulfilled',
          booklooker: booklookerResult.status === 'fulfilled'
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

      throw new ApiError(500, `Book search error: ${error.message}`);
    }
  }

  /**
   * Deduplicate books based on title and author similarity
   */
  deduplicateBooks(books) {
    const seen = new Set();
    const uniqueBooks = [];

    for (const book of books) {
      const isbn = Array.isArray(book.isbn) ? book.isbn[0] : book.isbn;
      const candidateAuthors = Array.isArray(book.authors)
        ? book.authors
        : Array.isArray(book.author_name)
        ? book.author_name
        : book.author
        ? [book.author]
        : [];
      const normalizedTitle = (book.title || '')
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const normalizedAuthors = candidateAuthors
        .map((a) => a.toString().toLowerCase().replace(/[^a-z0-9]/g, ''))
        .join('');

      const key = isbn
        ? `isbn:${isbn}`
        : `${normalizedTitle}-${normalizedAuthors}`;

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