import { ApiError } from "../utils/errors.js";
import logger from "../config/logger.js";

const GOOGLE_BOOKS_API_BASE_URL = "https://www.googleapis.com/books/v1";

// HTML entity decoding + tag stripping for Google Books descriptions.
// Some volumes return volumeInfo.description with embedded HTML (<p>, <i>,
// <br>) and entities (&amp;, &#8217;, ...). Strip tags, decode entities, and
// collapse whitespace so every consumer (API, cards, SEO SSR) gets plain text.
const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ndash: "\u2013", mdash: "\u2014", hellip: "\u2026",
  lsquo: "\u2018", rsquo: "\u2019", ldquo: "\u201C", rdquo: "\u201D",
  copy: "\u00A9", reg: "\u00AE", trade: "\u2122", bull: "\u2022",
  middot: "\u00B7", eacute: "\u00E9", aacute: "\u00E1", iacute: "\u00ED",
  oacute: "\u00F3", uacute: "\u00FA", ntilde: "\u00F1", uuml: "\u00FC",
  ouml: "\u00F6", auml: "\u00E4", szlig: "\u00DF", egrave: "\u00E8",
};

function decodeHtmlEntities(str) {
  return str.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, body) => {
    if (body[0] === "#") {
      const isHex = body[1] === "x" || body[1] === "X";
      const code = parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10);
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[body] ?? match;
  });
}

function cleanDescription(raw) {
  if (!raw) return null;
  const withoutTags = raw.replace(/<[^>]*>/g, " ");
  const decoded = decodeHtmlEntities(withoutTags);
  return decoded.replace(/\s+/g, " ").trim();
}

/**
 * Search Google Books API
 * @param {Object} params - Search parameters
 * @param {string} [params.title] - Book title
 * @param {string} [params.author] - Author name
 * @param {string} [params.subject] - Subject/category to search for
 * @param {number} [params.page=1] - Page number
 * @returns {Promise<Array>} Array of book objects
 */
export async function searchGoogleBooks({ title, author, subject, q, page = 1 }) {
  try {
    if (!title && !author && !subject && !q) {
      throw new ApiError("At least one of title, author, subject, or q is required", 400);
    }

    // Build search query
    let query = "";
    if (q) {
      // General full-text query (used by SEO landing pages for long-tail
      // keywords like "best science fiction books")
      query = encodeURIComponent(q);
    } else if (subject) {
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
          "User-Agent": "BookPath/1.0 (https://bookpath.org)",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 403) {
          const errorText = await response.text().catch(() => '');
          logger.error("Google Books API 403 Forbidden", {
            hasErrorBody: Boolean(errorText),
            status: response.status
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
 * Get a single book by Google Books volume ID
 * @param {string} volumeId - Google Books volume ID (without 'google-' prefix)
 * @returns {Promise<Object>} Book object
 */
export async function getGoogleBookById(volumeId) {
  try {
    if (!volumeId) {
      throw new ApiError("Volume ID is required", 400);
    }

    // Build URL with optional API key
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    let url = `${GOOGLE_BOOKS_API_BASE_URL}/volumes/${encodeURIComponent(volumeId)}`;
    
    if (apiKey) {
      url += `?key=${apiKey}`;
    }

    logger.info("Fetching Google Book by ID", { volumeId });

    // Make request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "BookPath/1.0 (https://bookpath.org)",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new ApiError("Book not found in Google Books", 404);
        }
        if (response.status === 403) {
          const errorText = await response.text().catch(() => '');
          logger.error("Google Books API 403 Forbidden", {
            error: errorText,
            reason: "access_denied"
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

      // Transform Google Books result to our format
      const book = transformGoogleBook(data);

      logger.info("Google Book fetch successful", { volumeId, title: book.title });

      return book;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    logger.error("Google Books fetch by ID error", {
      error: error.message,
      volumeId,
    });

    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === "AbortError") {
      throw new ApiError("Google Books API request timed out", 504);
    }

    throw new ApiError(
      `Failed to fetch Google Book: ${error.message}`,
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

  // Extract description (clean HTML tags + entities — some volumes embed
  // <p>/<i>/<b> markup and &amp;/&#8217; entities in the raw text)
  const description = cleanDescription(volumeInfo.description);

  // Extract average rating
  const averageRating = volumeInfo.averageRating || null;
  const ratingsCount = volumeInfo.ratingsCount || 0;

  // Extract price information
  let price = null;
  let currencyCode = null;
  if (saleInfo.saleability === 'FOR_SALE' || saleInfo.saleability === 'FOR_PREORDER') {
    // Prefer retail price (discounted price) over list price
    if (saleInfo.retailPrice?.amount) {
      price = saleInfo.retailPrice.amount;
      currencyCode = saleInfo.retailPrice.currencyCode || 'USD';
    } else if (saleInfo.listPrice?.amount) {
      price = saleInfo.listPrice.amount;
      currencyCode = saleInfo.listPrice.currencyCode || 'USD';
    }
  }

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
    price: price,
    currencyCode: currencyCode,
    buyLink: saleInfo.buyLink || null,
    // Access info
    hasFullText: accessInfo.text || false,
    // Source identifier
    source: "google-books",
  };
}

export default {
  searchGoogleBooks,
  getGoogleBookById,
};
