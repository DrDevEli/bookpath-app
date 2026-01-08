import { ApiError } from "../utils/errors.js";
// import openLibraryService from "./openLibraryService.js"; // COMMENTED OUT FOR TESTING - Google Books only
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

      // COMMENTED OUT FOR TESTING - Google Books only
      // Fetch from all sources in parallel
      // const [openLibResult, googleResult] = await Promise.allSettled([
      //   openLibraryService.search({ title, author, subject: subjectSearchTerm, page }),
      //   searchGoogleBooks({ title, author, subject: subjectSearchTerm, page })
      // ]);

      // Fetch from Google Books only
      const [googleResult] = await Promise.allSettled([
        searchGoogleBooks({ title, author, subject: subjectSearchTerm, page })
      ]);

      // Process results and handle errors gracefully
      let allBooks = [];
      let errors = [];

      // COMMENTED OUT FOR TESTING - Open Library processing
      // Process Open Library results
      // if (openLibResult.status === 'fulfilled') {
      //   allBooks = allBooks.concat(openLibResult.value.data || []);
      //   logger.info("Open Library search successful", { 
      //     resultCount: openLibResult.value.data?.length || 0 
      //   });
      // } else {
      //   errors.push(`Open Library: ${openLibResult.reason.message}`);
      //   logger.warn("Open Library search failed", { 
      //     error: openLibResult.reason.message 
      //   });
      // }

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

      // Enrich top results (first page only, up to 20 books) with descriptions if missing (for Open Library books)
      // This improves user experience for the most visible results
      const booksToEnrich = page === 1 ? sortedBooks.slice(0, 20) : [];
      const enrichedBooks = booksToEnrich.length > 0 
        ? await this.enrichTopResultsWithDescriptions(booksToEnrich)
        : [];
      const remainingBooks = page === 1 ? sortedBooks.slice(20) : sortedBooks;
      const allEnrichedBooks = page === 1 ? [...enrichedBooks, ...remainingBooks] : sortedBooks;

      // Add Amazon affiliate links
      const booksWithAffiliateLinks = await this.addAffiliateLinks(allEnrichedBooks);

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
          // openLibrary: openLibResult.status === 'fulfilled', // COMMENTED OUT FOR TESTING
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
   * Merges duplicate books, prioritizing Google Books data (especially descriptions)
   */
  deduplicateBooks(books) {
    const seen = new Map();
    const uniqueBooks = [];

    for (const book of books) {
      // Create a key based on normalized title and author
      const normalizedTitle = book.title?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
      const normalizedAuthors = book.authors?.map(a => a.toLowerCase().replace(/[^a-z0-9]/g, '')).join('') || '';
      const key = `${normalizedTitle}-${normalizedAuthors}`;

      if (!seen.has(key)) {
        seen.set(key, book);
        uniqueBooks.push(book);
      } else {
        // Merge with existing book, prioritizing Google Books data
        const existingBook = seen.get(key);
        const mergedBook = this.mergeBookData(existingBook, book);
        // Update the book in the array
        const index = uniqueBooks.indexOf(existingBook);
        uniqueBooks[index] = mergedBook;
        seen.set(key, mergedBook);
      }
    }

    return uniqueBooks;
  }

  /**
   * Merge two book objects, prioritizing Google Books data
   * Especially prioritizes descriptions from Google Books
   */
  mergeBookData(book1, book2) {
    // Determine which is from Google Books (has google- prefix in ID or source field)
    const book1IsGoogle = book1.id?.startsWith('google-') || book1.source === 'google-books';
    const book2IsGoogle = book2.id?.startsWith('google-') || book2.source === 'google-books';

    // Prefer Google Books book as base
    const baseBook = book1IsGoogle ? book1 : (book2IsGoogle ? book2 : book1);

    // Merge data, prioritizing Google Books descriptions
    return {
      ...baseBook,
      // Always prefer Google Books description if available
      description: book1IsGoogle && book1.description 
        ? book1.description 
        : (book2IsGoogle && book2.description 
          ? book2.description 
          : (book1.description || book2.description || null)),
      // Prefer Google Books cover image if available
      coverImage: book1IsGoogle && book1.coverImage 
        ? book1.coverImage 
        : (book2IsGoogle && book2.coverImage 
          ? book2.coverImage 
          : (book1.coverImage || book2.coverImage || null)),
      // Prefer Google Books ID if available
      id: book1IsGoogle ? book1.id : (book2IsGoogle ? book2.id : baseBook.id),
      // Merge other fields, preferring non-null values
      isbn: book1.isbn || book2.isbn || null,
      firstPublishYear: book1.firstPublishYear || book2.firstPublishYear || null,
      subjects: book1.subjects?.length ? book1.subjects : (book2.subjects?.length ? book2.subjects : []),
      // Prefer Google Books price if available
      price: book1IsGoogle && book1.price 
        ? book1.price 
        : (book2IsGoogle && book2.price 
          ? book2.price 
          : (book1.price || book2.price || null)),
      currencyCode: book1IsGoogle && book1.currencyCode 
        ? book1.currencyCode 
        : (book2IsGoogle && book2.currencyCode 
          ? book2.currencyCode 
          : (book1.currencyCode || book2.currencyCode || null)),
      // Keep Open Library key if available (for enrichment) - COMMENTED OUT FOR TESTING
      // openLibraryKey: book1.openLibraryKey || book2.openLibraryKey || null,
    };
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

  /**
   * Enrich top search results with descriptions if missing
   * Only enriches Open Library books that don't have descriptions
   * Note: Google Books descriptions are already included via deduplication
   * @param {Array} books - Array of book objects
   * @returns {Promise<Array>} Books with enriched descriptions
   * COMMENTED OUT FOR TESTING - Google Books only
   */
  async enrichTopResultsWithDescriptions(books) {
    // COMMENTED OUT FOR TESTING - Open Library enrichment disabled
    // const enrichmentPromises = books.map(async (book) => {
    //   // Only enrich Open Library books that are missing descriptions
    //   // Skip if it's a Google Books book (already has description) or already has description
    //   if (!book.description && 
    //       !book.id?.startsWith('google-') && 
    //       !book.source?.includes('google') &&
    //       (book.openLibraryKey || (book.id && book.id.startsWith('/works/')))) {
    //     try {
    //       return await openLibraryService.enrichWithDescription(book);
    //     } catch (error) {
    //       logger.warn("Failed to enrich book description in search", {
    //         bookId: book.id,
    //         error: error.message,
    //       });
    //       return book;
    //     }
    //   }
    //   return book;
    // });

    // return Promise.all(enrichmentPromises);
    return books; // Return books as-is without enrichment
  }
}