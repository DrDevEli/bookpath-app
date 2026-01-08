import { ApiError } from "../utils/errors.js";
import logger from "../config/logger.js";

const GOOGLE_BOOKS_API_BASE_URL = "https://www.googleapis.com/books/v1";

/**
 * Search Google Books API
 * @param {Object} params - Search parameters
 * @param {string} [params.title] - Book title
 * @param {string} [params.author] - Author name
 * @param {string} [params.subject] - Subject/category to search for
 * @param {number} [params.page=1] - Page number
 * @returns {Promise<Array>} Array of book objects
 */
export async function searchGoogleBooks({ title, author, subject, page = 1 }) {
  try {
    if (!title && !author && !subject) {
      throw new ApiError("At least one of title, author, or subject is required", 400);
    }

    // Build search query
    let query = "";
    if (subject) {
      // Subject search - Google Books uses "subject:" prefix
      query = `subject:${encodeURIComponent(subject)}`;
    } else if (title && author) {
      query = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
    } else if (title) {
      query = `intitle:${encodeURIComponent(title)}`;
    } else if (author) {
      query = `inauthor:${encodeURIComponent(author)}`;
    }

    // Google Books API pagination
    const maxResults = 20;
    const startIndex = (page - 1) * maxResults;

    // Build URL with optional API key
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    let url = `${GOOGLE_BOOKS_API_BASE_URL}/volumes?q=${query}&maxResults=${maxResults}&startIndex=${startIndex}`;
    
    if (apiKey) {
      url += `&key=${apiKey}`;
    }

    logger.info("Searching Google Books API", { query, page, startIndex });

    // Make request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "BookPath/1.0 (https://bookpath.eu)",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 403) {
          const errorText = await response.text().catch(() => '');
          logger.error("Google Books API 403 Forbidden", { 
            error: errorText,
            hasApiKey: !!apiKey,
            apiKeyLength: apiKey ? apiKey.length : 0
          });
          throw new ApiError(
            "Google Books API access denied. Please check API key configuration and restrictions.",
            403
          );
        }
        if (response.status === 429) {
          throw new ApiError("Google Books API rate limit exceeded", 429);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Transform Google Books results to our format
      const books = (data.items || []).map((item) => transformGoogleBook(item));

      logger.info("Google Books search successful", {
        resultCount: books.length,
        totalItems: data.totalItems || 0,
      });

      return books;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    logger.error("Google Books search error", {
      error: error.message,
      title,
      author,
      page,
    });

    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === "AbortError") {
      throw new ApiError("Google Books API request timed out", 504);
    }

    throw new ApiError(
      `Google Books search failed: ${error.message}`,
      500
    );
  }
}

/**
 * Transform Google Books API item to our book format
 * @param {Object} item - Google Books API volume item
 * @returns {Object} Transformed book object
 */
function transformGoogleBook(item) {
  const volumeInfo = item.volumeInfo || {};
  const saleInfo = item.saleInfo || {};
  const accessInfo = item.accessInfo || {};

  // Extract authors
  const authors = volumeInfo.authors || [];
  const authorNames = Array.isArray(authors) ? authors : [authors];

  // Extract categories/subjects
  const categories = volumeInfo.categories || [];
  const genres = Array.isArray(categories) ? categories : [categories];

  // Extract ISBN
  const isbn13 = volumeInfo.industryIdentifiers?.find(
    (id) => id.type === "ISBN_13"
  )?.identifier;
  const isbn10 = volumeInfo.industryIdentifiers?.find(
    (id) => id.type === "ISBN_10"
  )?.identifier;
  const isbn = isbn13 || isbn10 || null;

  // Extract cover image
  let coverImage = null;
  if (volumeInfo.imageLinks) {
    // Prefer large image, fallback to medium, then small
    coverImage =
      volumeInfo.imageLinks.large ||
      volumeInfo.imageLinks.medium ||
      volumeInfo.imageLinks.small ||
      volumeInfo.imageLinks.thumbnail ||
      null;
  }

  // Extract publish year
  const publishedDate = volumeInfo.publishedDate;
  let firstPublishYear = null;
  if (publishedDate) {
    // Extract year from date string (format: YYYY, YYYY-MM, or YYYY-MM-DD)
    const yearMatch = publishedDate.match(/^(\d{4})/);
    if (yearMatch) {
      firstPublishYear = parseInt(yearMatch[1]);
    }
  }

  // Extract description
  const description = volumeInfo.description || null;

  // Extract average rating
  const averageRating = volumeInfo.averageRating || null;
  const ratingsCount = volumeInfo.ratingsCount || 0;

  // Build Google Books ID (prefixed to avoid conflicts)
  const googleId = item.id ? `google-${item.id}` : null;

  return {
    id: googleId,
    title: volumeInfo.title || "Unknown Title",
    authors: authorNames,
    authorNames, // Alias for compatibility
    description,
    coverImage,
    firstPublishYear,
    subjects: genres,
    genres, // Alias for compatibility
    isbn,
    publisher: volumeInfo.publisher || null,
    publishDate: publishedDate || null,
    pageCount: volumeInfo.pageCount || null,
    language: volumeInfo.language || null,
    averageRating,
    ratingsCount,
    // Additional Google Books specific fields
    subtitle: volumeInfo.subtitle || null,
    previewLink: volumeInfo.previewLink || null,
    infoLink: volumeInfo.infoLink || null,
    canonicalVolumeLink: volumeInfo.canonicalVolumeLink || null,
    // Sale info
    isEbook: saleInfo.isEbook || false,
    saleability: saleInfo.saleability || null,
    // Access info
    hasFullText: accessInfo.text || false,
    // Source identifier
    source: "google-books",
  };
}

export default {
  searchGoogleBooks,
};
