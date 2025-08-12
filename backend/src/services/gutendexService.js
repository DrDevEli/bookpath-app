import axios from "axios";
import { ApiError } from "../utils/errors.js";
import logger from "../config/logger.js";
import { externalApiLatency, externalApiRequests, externalApiErrors } from "../utils/metrics.js";

const GUTENDEX_API_URL = "https://gutendex.com/books/";

export async function searchGutendex({ title, author, page = 1 }) {
  try {
    const params = {};
    if (title) params.search = title;
    if (author) params.search = author;
    params.page = page;

    logger.info("Searching Gutendex API", { 
      title, 
      author, 
      page,
      apiUrl: GUTENDEX_API_URL
    });

    const endTimer = externalApiLatency.startTimer({ service: "gutendex" });
    const res = await axios.get(GUTENDEX_API_URL, { 
      params,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BookPath/1.0'
      }
    });
    endTimer();
    externalApiRequests.inc({ service: "gutendex", status: res.status });

    if (!res.data || !res.data.results) {
      throw new ApiError(500, "Invalid response from Gutendex API");
    }

    // Map Gutendex data to our internal format
    const transformedData = res.data.results.map(book => ({
      id: `gutendex-${book.id}`,
      title: book.title,
      authors: book.authors?.map(a => a.name) || [],
      firstPublishYear: book.download_count ? new Date().getFullYear() : null, // Gutendex doesn't have publish year
      coverImage: book.formats?.["image/jpeg"] || book.formats?.["image/png"] || null,
      editionCount: 1, // Gutendex books are typically single editions
      hasFullText: book.formats?.["text/plain; charset=utf-8"] ? true : false,
      ratingsAverage: null, // Gutendex doesn't provide ratings
      ratingsCount: null,
      openLibraryKey: null,
      source: "gutendex",
      downloadCount: book.download_count,
      subjects: book.subjects || [],
      languages: book.languages || [],
      formats: book.formats || {}
    }));

    logger.info("Gutendex search completed successfully", { 
      resultCount: transformedData.length,
      totalResults: res.data.count || 0
    });

    return transformedData;
  } catch (error) {
    externalApiErrors.inc({ service: "gutendex" });
    logger.error("Gutendex search error", {
      error: error.message,
      title,
      author,
      page,
      apiUrl: GUTENDEX_API_URL,
      response: error.response?.data
    });

    if (error.response?.status === 404) {
      throw new ApiError(404, "Gutendex search endpoint not found");
    }
    if (error.response?.status === 429) {
      throw new ApiError(429, "Gutendex API rate limit exceeded");
    }
    if (error.code === 'ECONNREFUSED') {
      throw new ApiError(503, "Cannot connect to Gutendex API");
    }
    if (error.code === 'ECONNABORTED') {
      throw new ApiError(408, "Gutendex API request timed out");
    }

    throw new ApiError(500, `Gutendex search error: ${error.message}`);
  }
}
