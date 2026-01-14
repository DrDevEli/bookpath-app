import { searchGoogleBooks } from "./googleBooksService.js";
import { cache } from "../utils/cache.js";
import logger from "../config/logger.js";

// Featured books configuration - matches frontend FeaturedBooks.tsx
const FEATURED_BOOKS_CONFIG = [
  {
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
  },
  {
    title: "A Brief History of Time",
    author: "Stephen Hawking",
  },
  {
    title: "Harry Potter and the Sorcerer's Stone",
    author: "J.K. Rowling",
  },
  {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
  },
  {
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
  },
  {
    title: "Sapiens: A Brief History of Humankind",
    author: "Yuval Noah Harari",
  },
];

const CACHE_KEY_PREFIX = "featured-book:";
const CACHE_TTL = 7 * 24 * 60 * 60; // 7 days - featured books don't change often

/**
 * Search for a featured book in Google Books and cache it
 * @param {Object} config - Book configuration with title and author
 * @param {number} index - Index of the featured book (0-5)
 * @returns {Promise<Object|null>} Cached book data or null if not found
 */
async function searchAndCacheFeaturedBook(config, index) {
  try {
    logger.info("Searching for featured book", { 
      index, 
      title: config.title, 
      author: config.author 
    });

    // Search Google Books for the featured book
    const results = await searchGoogleBooks({
      title: config.title,
      author: config.author,
      page: 1,
    });

    if (!results || results.length === 0) {
      logger.warn("Featured book not found in Google Books", {
        index,
        title: config.title,
        author: config.author,
      });
      return null;
    }

    // Find the best match (exact title match preferred)
    let bestMatch = results[0];
    for (const book of results) {
      const bookTitleLower = book.title?.toLowerCase() || "";
      const configTitleLower = config.title.toLowerCase();
      
      // Prefer exact title match
      if (bookTitleLower === configTitleLower) {
        bestMatch = book;
        break;
      }
      
      // Prefer books with the exact title at the start
      if (bookTitleLower.startsWith(configTitleLower)) {
        bestMatch = book;
      }
    }

    // Cache the book data with the featured-X key
    const cacheKey = `${CACHE_KEY_PREFIX}${index}`;
    await cache.set(cacheKey, bestMatch, CACHE_TTL);

    logger.info("Featured book cached successfully", {
      index,
      title: bestMatch.title,
      bookId: bestMatch.id,
    });

    return bestMatch;
  } catch (error) {
    logger.error("Error searching and caching featured book", {
      index,
      title: config.title,
      error: error.message,
    });
    return null;
  }
}

/**
 * Initialize and cache all featured books
 * @returns {Promise<Object>} Results of caching operation
 */
export async function initializeFeaturedBooks() {
  logger.info("Initializing featured books cache");

  const results = {
    total: FEATURED_BOOKS_CONFIG.length,
    cached: 0,
    failed: 0,
    books: [],
  };

  // Cache all featured books in parallel
  const cachePromises = FEATURED_BOOKS_CONFIG.map((config, index) =>
    searchAndCacheFeaturedBook(config, index)
  );

  const cachedBooks = await Promise.allSettled(cachePromises);

  cachedBooks.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) {
      results.cached++;
      results.books.push({
        index,
        title: result.value.title,
        id: result.value.id,
        cached: true,
      });
    } else {
      results.failed++;
      logger.warn("Failed to cache featured book", {
        index,
        error: result.reason?.message || "Unknown error",
      });
    }
  });

  logger.info("Featured books initialization complete", results);
  return results;
}

/**
 * Get a cached featured book by index
 * @param {number} index - Featured book index (0-5)
 * @returns {Promise<Object|null>} Cached book data or null
 */
export async function getCachedFeaturedBook(index) {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${index}`;
    const cachedBook = await cache.get(cacheKey);

    if (cachedBook) {
      logger.debug("Featured book cache hit", { index, bookId: cachedBook.id });
      return cachedBook;
    }

    logger.debug("Featured book cache miss", { index });
    
    // If not cached, try to cache it now
    if (index >= 0 && index < FEATURED_BOOKS_CONFIG.length) {
      const config = FEATURED_BOOKS_CONFIG[index];
      return await searchAndCacheFeaturedBook(config, index);
    }

    return null;
  } catch (error) {
    logger.error("Error getting cached featured book", {
      index,
      error: error.message,
    });
    return null;
  }
}

/**
 * Get featured book index from featured-X ID
 * @param {string} id - Featured book ID (e.g., "featured-2")
 * @returns {number|null} Index or null if invalid
 */
export function getFeaturedBookIndex(id) {
  if (!id || !id.startsWith("featured-")) {
    return null;
  }

  const indexStr = id.replace("featured-", "");
  const index = parseInt(indexStr, 10);

  if (isNaN(index) || index < 0 || index >= FEATURED_BOOKS_CONFIG.length) {
    return null;
  }

  return index;
}

export default {
  initializeFeaturedBooks,
  getCachedFeaturedBook,
  getFeaturedBookIndex,
  FEATURED_BOOKS_CONFIG,
};
