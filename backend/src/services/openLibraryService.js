import axios from "axios";
import { ApiError } from "../utils/errors.js";
import redis from "../config/redis.js";
import logger from "../config/logger.js";
import { externalApiLatency, externalApiRequests, externalApiErrors } from "../utils/metrics.js";

const OPEN_LIBRARY_API_URL = "https://openlibrary.org";
const CACHE_TTL = parseInt(process.env.SEARCH_CACHE_TTL || "3600");

class OpenLibraryService {
  /**
   * Search for books using Open Library Search API
   * @param {Object} params - Search parameters
   * @param {string} [params.title] - Title to search
   * @param {string} [params.author] - Author name
   * @param {number} [params.page=1] - Page number
   * @returns {Promise<Object>} Search results with pagination
   */
  async search({ title, author, page = 1 }) {
    if (!title && !author) {
      throw new ApiError(400, "At least one search parameter must be provided");
    }

    // Create cache key
    const cacheKey = `openlibrary:search:${title || ''}:${author || ''}:${page}`;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug("Using cached Open Library search results");
      return JSON.parse(cached);
    }

    try {
      // Build search query
      let query = "";
      if (title && author) {
        query = `${title} author:${author}`;
      } else if (title) {
        query = title;
      } else if (author) {
        query = `author:${author}`;
      }

      const limit = 20; // Open Library default limit
      const offset = (page - 1) * limit;

      logger.info("Searching Open Library API", { 
        query, 
        page,
        offset,
        limit,
        apiUrl: `${OPEN_LIBRARY_API_URL}/search.json`
      });

      const endTimer = externalApiLatency.startTimer({ service: "openlibrary" });
      const res = await axios.get(`${OPEN_LIBRARY_API_URL}/search.json`, { 
        params: {
          q: query,
          limit,
          offset,
          fields: "key,title,author_name,first_publish_year,cover_i,edition_count,has_fulltext,ia,ratings_average,ratings_count"
        },
        timeout: 15000, // 15 second timeout
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BookLens/1.0 (https://github.com/your-repo/booklens; your-email@example.com)'
        }
      });
      endTimer();
      externalApiRequests.inc({ service: "openlibrary", status: res.status });

      logger.debug("Open Library search response", { 
        status: res.status, 
        statusText: res.statusText,
        hasData: !!res.data,
        resultCount: res.data?.numFound || 0
      });

      if (!res.data) {
        throw new ApiError(500, "Invalid response from Open Library API");
      }

      // Transform Open Library data to our format
      const transformedData = res.data.docs.map(doc => ({
        id: doc.key?.replace('/works/', '') || doc.key,
        title: doc.title,
        authors: doc.author_name || [],
        firstPublishYear: doc.first_publish_year,
        coverImage: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
        editionCount: doc.edition_count,
        hasFullText: doc.has_fulltext,
        ia: doc.ia,
        ratingsAverage: doc.ratings_average,
        ratingsCount: doc.ratings_count,
        openLibraryKey: doc.key
      }));

      const totalPages = Math.ceil(res.data.numFound / limit);
      
      const result = { 
        data: transformedData,
        pagination: {
          currentPage: page,
          totalPages,
          totalResults: res.data.numFound,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };

      // Cache the result
      await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
      
      logger.info("Open Library search completed successfully", { 
        resultCount: transformedData.length,
        totalResults: res.data.numFound,
        totalPages
      });

      return result;
    } catch (error) {
      externalApiErrors.inc({ service: "openlibrary" });
      logger.error("Open Library search error", {
        error: error.message,
        title,
        author,
        page,
        apiUrl: OPEN_LIBRARY_API_URL,
        response: error.response?.data
      });

      if (error.response?.status === 404) {
        throw new ApiError(404, "Open Library search endpoint not found");
      }
      if (error.response?.status === 429) {
        throw new ApiError(429, "Open Library API rate limit exceeded");
      }
      if (error.code === 'ECONNREFUSED') {
        throw new ApiError(503, "Cannot connect to Open Library API");
      }
      if (error.code === 'ECONNABORTED') {
        throw new ApiError(408, "Open Library API request timed out");
      }

      throw new ApiError(500, `Open Library search error: ${error.message}`);
    }
  }

  /**
   * Get book details by Open Library work ID
   * @param {string} workId - Open Library work ID
   * @returns {Promise<Object>} Book details
   */
  async getBookDetails(workId) {
    const cacheKey = `openlibrary:book:${workId}`;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug("Using cached book details");
      return JSON.parse(cached);
    }

    try {
      logger.info("Fetching book details from Open Library", { workId });

      const endTimer = externalApiLatency.startTimer({ service: "openlibrary" });
      const res = await axios.get(`${OPEN_LIBRARY_API_URL}${workId}.json`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BookLens/1.0 (https://github.com/your-repo/booklens; your-email@example.com)'
        }
      });
      endTimer();
      externalApiRequests.inc({ service: "openlibrary", status: res.status });

      if (!res.data) {
        throw new ApiError(404, "Book not found");
      }

      // Transform the data
      const bookData = {
        id: workId.replace('/works/', ''),
        title: res.data.title,
        authors: res.data.authors?.map(author => author.author?.key) || [],
        authorNames: res.data.authors?.map(author => author.author?.name) || [],
        description: res.data.description?.value || res.data.description || null,
        firstPublishYear: res.data.first_publish_date,
        subjects: res.data.subjects || [],
        covers: res.data.covers || [],
        coverImage: res.data.covers?.[0] ? `https://covers.openlibrary.org/b/id/${res.data.covers[0]}-L.jpg` : null,
        openLibraryKey: workId,
        type: res.data.type?.key || 'work'
      };

      // Cache for longer since book details don't change often
      await redis.set(cacheKey, JSON.stringify(bookData), "EX", CACHE_TTL * 2);
      
      logger.info("Book details fetched successfully", { workId });
      return bookData;
    } catch (error) {
      externalApiErrors.inc({ service: "openlibrary" });
      logger.error("Error fetching book details", {
        error: error.message,
        workId,
        response: error.response?.data
      });

      if (error.response?.status === 404) {
        throw new ApiError(404, "Book not found");
      }

      throw new ApiError(500, `Error fetching book details: ${error.message}`);
    }
  }

  /**
   * Get author details by Open Library author ID
   * @param {string} authorId - Open Library author ID
   * @returns {Promise<Object>} Author details
   */
  async getAuthorDetails(authorId) {
    const cacheKey = `openlibrary:author:${authorId}`;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug("Using cached author details");
      return JSON.parse(cached);
    }

    try {
      logger.info("Fetching author details from Open Library", { authorId });

      const endTimer = externalApiLatency.startTimer({ service: "openlibrary" });
      const res = await axios.get(`${OPEN_LIBRARY_API_URL}${authorId}.json`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BookLens/1.0 (https://github.com/your-repo/booklens; your-email@example.com)'
        }
      });
      endTimer();
      externalApiRequests.inc({ service: "openlibrary", status: res.status });

      if (!res.data) {
        throw new ApiError(404, "Author not found");
      }

      const authorData = {
        id: authorId.replace('/authors/', ''),
        name: res.data.name,
        birthDate: res.data.birth_date,
        deathDate: res.data.death_date,
        bio: res.data.bio?.value || res.data.bio || null,
        photos: res.data.photos || [],
        photoImage: res.data.photos?.[0] ? `https://covers.openlibrary.org/a/olid/${authorId.replace('/authors/', '')}-L.jpg` : null,
        openLibraryKey: authorId
      };

      // Cache for longer since author details don't change often
      await redis.set(cacheKey, JSON.stringify(authorData), "EX", CACHE_TTL * 2);
      
      logger.info("Author details fetched successfully", { authorId });
      return authorData;
    } catch (error) {
      externalApiErrors.inc({ service: "openlibrary" });
      logger.error("Error fetching author details", {
        error: error.message,
        authorId,
        response: error.response?.data
      });

      if (error.response?.status === 404) {
        throw new ApiError(404, "Author not found");
      }

      throw new ApiError(500, `Error fetching author details: ${error.message}`);
    }
  }
}

export default new OpenLibraryService(); 