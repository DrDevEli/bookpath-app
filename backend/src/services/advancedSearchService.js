import { ApiError } from "../utils/errors.js";
// import openLibraryService from "./openLibraryService.js"; // COMMENTED OUT FOR TESTING - Google Books only
import logger from "../config/logger.js";

class AdvancedSearchService {
  /**
   * Perform advanced book search with multiple filters
   * @param {Object} params - Search parameters
   * @param {string} [params.title] - Title to search
   * @param {string} [params.author] - Author name
   * @param {string} [params.genre] - Genre filter (maps to subjects in Open Library)
   * @param {number} [params.page=1] - Page number
   * @returns {Promise<Object>} Search results with pagination
   */
  async advancedSearch({
    title,
    author,
    genre,
    page = 1,
  }) {
    if (!title && !author && !genre) {
      throw new ApiError("At least one search parameter must be provided", 400);
    }

    try {
      logger.info("Performing advanced search using Open Library API", { 
        title, 
        author, 
        genre,
        page
      });

      // For Open Library, we'll use the basic search but can enhance with genre filtering
      // Open Library doesn't have direct genre support, but we can search by subject
      let searchTitle = title;
      let searchAuthor = author;
      
      // If genre is specified, we can add it to the search query
      if (genre) {
        if (searchTitle) {
          searchTitle = `${searchTitle} subject:${genre}`;
        } else if (searchAuthor) {
          searchAuthor = `${searchAuthor} subject:${genre}`;
        } else {
          // If only genre is provided, search by subject
          searchTitle = `subject:${genre}`;
        }
      }

      // COMMENTED OUT FOR TESTING - Open Library advanced search disabled
      // const result = await openLibraryService.search({ 
      //   title: searchTitle, 
      //   author: searchAuthor, 
      //   page 
      // });
      
      // Return empty result since Open Library is disabled
      throw new ApiError("Advanced search is currently disabled. Please use the main search endpoint with Google Books.", 503);
      
      logger.info("Advanced search completed successfully", { 
        resultCount: Array.isArray(result.data) ? result.data.length : 0,
        totalResults: result.pagination?.totalResults || 0
      });

      return result;
    } catch (error) {
      logger.error("Advanced search error", {
        error: error.message,
        title,
        author,
        genre,
        page
      });

      // Re-throw the error as it's already an ApiError from the Open Library service
      throw error;
    }
  }
}

export default new AdvancedSearchService();
