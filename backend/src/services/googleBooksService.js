import axios from "axios";
import logger from "../config/logger.js";
import { ApiError } from "../utils/errors.js";
import { externalApiLatency, externalApiRequests, externalApiErrors } from "../utils/metrics.js";

const GOOGLE_BOOKS_API_URL = "https://www.googleapis.com/books/v1/volumes";
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

export async function searchGoogleBooks({ title, author, page = 1 }) {
  try {
    if (!GOOGLE_BOOKS_API_KEY) {
      logger.warn("Google Books API key not configured");
      throw new ApiError("Google Books API key not configured", 500);
    }

    let q = [];
    if (title) q.push(`intitle:${title}`);
    if (author) q.push(`inauthor:${author}`);
    
    const params = {
      q: q.join(" "),
      startIndex: (page - 1) * 20,
      maxResults: 20,
      key: GOOGLE_BOOKS_API_KEY
    };

    logger.info("Searching Google Books API", { 
      title, 
      author, 
      page,
      query: params.q,
      apiUrl: GOOGLE_BOOKS_API_URL
    });

    const endTimer = externalApiLatency.startTimer({ service: "googlebooks" });
    const res = await axios.get(GOOGLE_BOOKS_API_URL, { 
      params,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BookPath/1.0'
      }
    });
    endTimer();
    externalApiRequests.inc({ service: "googlebooks", status: res.status });

    if (!res.data) {
      logger.warn("Invalid response from Google Books API");
      return [];
    }

    // Map Google Books data to our internal format
    const transformedData = (res.data.items || []).map(item => ({
      id: `google-${item.id}`,
      title: item.volumeInfo?.title || 'Unknown Title',
      authors: item.volumeInfo?.authors || [],
      firstPublishYear: item.volumeInfo?.publishedDate ? 
        new Date(item.volumeInfo.publishedDate).getFullYear() : null,
      coverImage: item.volumeInfo?.imageLinks?.thumbnail || 
                 item.volumeInfo?.imageLinks?.smallThumbnail || null,
      editionCount: item.volumeInfo?.pageCount || null,
      hasFullText: item.accessInfo?.pdf?.isAvailable || false,
      ratingsAverage: item.volumeInfo?.averageRating || null,
      ratingsCount: item.volumeInfo?.ratingsCount || null,
      openLibraryKey: null,
      source: "google",
      previewLink: item.volumeInfo?.previewLink || null,
      infoLink: item.volumeInfo?.infoLink || null,
      description: item.volumeInfo?.description || null,
      categories: item.volumeInfo?.categories || [],
      language: item.volumeInfo?.language || null,
      pageCount: item.volumeInfo?.pageCount || null,
      publisher: item.volumeInfo?.publisher || null,
      isbn: item.volumeInfo?.industryIdentifiers || []
    }));

    logger.info("Google Books search completed successfully", { 
      resultCount: transformedData.length,
      totalResults: res.data.totalItems || 0
    });

    return transformedData;
  } catch (error) {
    externalApiErrors.inc({ service: "googlebooks" });
    logger.error("Google Books search error", {
      error: error.message,
      title,
      author,
      page,
      apiUrl: GOOGLE_BOOKS_API_URL,
      response: error.response?.data
    });

    if (error.response?.status === 400) {
      logger.warn("Invalid Google Books API request");
      return [];
    }
    if (error.response?.status === 403) {
      logger.warn("Google Books API key invalid or quota exceeded");
      return [];
    }
    if (error.response?.status === 429) {
      logger.warn("Google Books API rate limit exceeded");
      return [];
    }
    if (error.code === 'ECONNREFUSED') {
      logger.warn("Cannot connect to Google Books API");
      return [];
    }
    if (error.code === 'ECONNABORTED') {
      logger.warn("Google Books API request timed out");
      return [];
    }

    // Return empty array instead of throwing error to not break the entire search
    return [];
  }
}
