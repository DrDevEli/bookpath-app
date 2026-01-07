import { ApiError } from "../utils/errors.js";
import logger from "../config/logger.js";

const OPEN_LIBRARY_BASE_URL = "https://openlibrary.org";
const OPEN_LIBRARY_COVERS_URL = "https://covers.openlibrary.org";

class OpenLibraryService {
  /**
   * Search for books using Open Library API
   * @param {Object} params - Search parameters
   * @param {string} [params.title] - Book title
   * @param {string} [params.author] - Author name
   * @param {number} [params.page=1] - Page number
   * @returns {Promise<Object>} Search results with data and pagination
   */
  async search({ title, author, page = 1 }) {
    try {
      if (!title && !author) {
        throw new ApiError("At least one of title or author is required", 400);
      }

      // Build search query
      let query = "";
      if (title && author) {
        query = `title:${encodeURIComponent(title)} AND author:${encodeURIComponent(author)}`;
      } else if (title) {
        query = `title:${encodeURIComponent(title)}`;
      } else if (author) {
        query = `author:${encodeURIComponent(author)}`;
      }

      const limit = 20;
      const offset = (page - 1) * limit;

      const url = `${OPEN_LIBRARY_BASE_URL}/search.json?q=${query}&limit=${limit}&offset=${offset}`;

      logger.info("Searching Open Library", { query, page, offset });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const docs = data.docs || [];
        const numFound = data.numFound || 0;

        // Transform Open Library results to our format
        const books = docs.map((doc) => this.transformBookResult(doc));

        return {
          data: books,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(numFound / limit),
            totalResults: numFound,
            hasNextPage: offset + limit < numFound,
            hasPreviousPage: page > 1,
          },
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      logger.error("Open Library search error", {
        error: error.message,
        title,
        author,
        page,
      });

      if (error instanceof ApiError) {
        throw error;
      }

      if (error.name === "AbortError") {
        throw new ApiError("Open Library search request timed out", 504);
      }

      throw new ApiError(
        `Open Library search failed: ${error.message}`,
        500
      );
    }
  }

  /**
   * Get detailed book information by work ID
   * @param {string} workId - Open Library work ID (e.g., "/works/OL4322177W" or "OL4322177W")
   * @returns {Promise<Object>} Book details
   */
  async getBookDetails(workId) {
    try {
      // Normalize work ID format
      let normalizedWorkId = workId;
      if (!normalizedWorkId.startsWith("/works/")) {
        normalizedWorkId = `/works/${normalizedWorkId}`;
      }

      // Remove leading slash if present for API call
      const apiWorkId = normalizedWorkId.startsWith("/")
        ? normalizedWorkId.slice(1)
        : normalizedWorkId;

      const url = `${OPEN_LIBRARY_BASE_URL}${normalizedWorkId}.json`;

      logger.info("Fetching book details from Open Library", { workId, url });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 404) {
            throw new ApiError("Book not found in Open Library", 404);
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const work = await response.json();

      // Get cover image
      const coverId = work.covers?.[0];
      const coverImage = coverId
        ? `${OPEN_LIBRARY_COVERS_URL}/b/id/${coverId}-L.jpg`
        : null;

      // Get author details
      const authorNames = [];
      if (work.authors && Array.isArray(work.authors)) {
        const authorPromises = work.authors
          .slice(0, 5) // Limit to first 5 authors
          .map(async (author) => {
            try {
              const authorKey = author.author?.key || author.key;
              if (authorKey) {
                const authorUrl = `${OPEN_LIBRARY_BASE_URL}${authorKey}.json`;
                const authorController = new AbortController();
                const authorTimeoutId = setTimeout(() => authorController.abort(), 5000);
                
                try {
                  const authorResponse = await fetch(authorUrl, {
                    signal: authorController.signal,
                  });
                  clearTimeout(authorTimeoutId);
                  
                  if (authorResponse.ok) {
                    const authorData = await authorResponse.json();
                    return authorData.name || null;
                  }
                } finally {
                  clearTimeout(authorTimeoutId);
                }
              }
              return author.name || null;
            } catch (error) {
              logger.warn("Failed to fetch author details", {
                authorKey: author.author?.key || author.key,
                error: error.message,
              });
              return author.name || null;
            }
          });

        const names = await Promise.all(authorPromises);
        authorNames.push(...names.filter(Boolean));
      }

      // Extract description
      let description = null;
      if (work.description) {
        if (typeof work.description === "string") {
          description = work.description;
        } else if (work.description.value) {
          description = work.description.value;
        } else if (Array.isArray(work.description) && work.description[0]?.value) {
          description = work.description[0].value;
        }
      }

      // Extract first publish year
      const firstPublishYear =
        work.first_publish_date?.split("-")[0] ||
        work.publish_date?.split("-")[0] ||
        work.first_published ||
        null;

      // Extract subjects
      const subjects =
        work.subjects?.map((s) => (typeof s === "string" ? s : s.name || s)) ||
        [];

      // Extract Open Library key (work ID without /works/ prefix)
      const openLibraryKey = apiWorkId.replace("/works/", "");

      return {
        id: normalizedWorkId,
        openLibraryKey,
        title: work.title || "Unknown Title",
        authorNames,
        description,
        coverImage,
        firstPublishYear: firstPublishYear ? parseInt(firstPublishYear) : null,
        subjects,
        isbn: work.isbn?.[0] || null,
        publisher: work.publishers?.[0] || null,
        publishDate: work.publish_date || null,
        pageCount: work.number_of_pages || null,
        language: work.languages?.[0]?.key?.replace("/languages/", "") || null,
      };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      logger.error("Error fetching book details from Open Library", {
        error: error.message,
        workId,
      });

      if (error instanceof ApiError) {
        throw error;
      }

      if (error.name === "AbortError") {
        throw new ApiError("Request to Open Library timed out", 504);
      }

      throw new ApiError(
        `Failed to fetch book details: ${error.message}`,
        500
      );
    }
  }

  /**
   * Get author details by author ID
   * @param {string} authorId - Open Library author ID (e.g., "/authors/OL34184A" or "OL34184A")
   * @returns {Promise<Object>} Author details
   */
  async getAuthorDetails(authorId) {
    try {
      // Normalize author ID format
      let normalizedAuthorId = authorId;
      if (!normalizedAuthorId.startsWith("/authors/")) {
        normalizedAuthorId = `/authors/${normalizedAuthorId}`;
      }

      const url = `${OPEN_LIBRARY_BASE_URL}${normalizedAuthorId}.json`;

      logger.info("Fetching author details from Open Library", {
        authorId,
        url,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 404) {
            throw new ApiError("Author not found in Open Library", 404);
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const author = await response.json();

      // Get author's works
      const works = [];
      if (author.works && Array.isArray(author.works)) {
        // Limit to first 10 works
        const workPromises = author.works.slice(0, 10).map(async (work) => {
          try {
            const workKey = work.key || work;
            const workUrl = `${OPEN_LIBRARY_BASE_URL}${workKey}.json`;
            const workController = new AbortController();
            const workTimeoutId = setTimeout(() => workController.abort(), 5000);
            
            try {
              const workResponse = await fetch(workUrl, {
                signal: workController.signal,
              });
              clearTimeout(workTimeoutId);
              
              if (workResponse.ok) {
                const workData = await workResponse.json();
                return {
                  id: workKey,
                  title: workData.title || "Unknown Title",
                  firstPublishYear:
                    workData.first_publish_date?.split("-")[0] ||
                    workData.first_published ||
                    null,
                };
              }
            } finally {
              clearTimeout(workTimeoutId);
            }
            return null;
          } catch (error) {
            logger.warn("Failed to fetch work details", {
              workKey: work.key || work,
              error: error.message,
            });
            return null;
          }
        });

        const workResults = await Promise.all(workPromises);
        works.push(...workResults.filter(Boolean));
      }

      return {
        id: normalizedAuthorId,
        name: author.name || "Unknown Author",
        bio:
          author.bio?.value ||
          (typeof author.bio === "string" ? author.bio : null) ||
          null,
        birthDate: author.birth_date || null,
        deathDate: author.death_date || null,
        alternateNames: author.alternate_names || [],
        works,
      };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      logger.error("Error fetching author details from Open Library", {
        error: error.message,
        authorId,
      });

      if (error instanceof ApiError) {
        throw error;
      }

      if (error.name === "AbortError") {
        throw new ApiError("Request to Open Library timed out", 504);
      }

      throw new ApiError(
        `Failed to fetch author details: ${error.message}`,
        500
      );
    }
  }

  /**
   * Transform Open Library search result to our book format
   * @param {Object} doc - Open Library document
   * @returns {Object} Transformed book object
   */
  transformBookResult(doc) {
    const coverId = doc.cover_i || doc.cover_edition_key
      ? doc.cover_i
      : null;
    const coverImage = coverId
      ? `${OPEN_LIBRARY_COVERS_URL}/b/id/${coverId}-L.jpg`
      : doc.cover_edition_key
      ? `${OPEN_LIBRARY_COVERS_URL}/b/olid/${doc.cover_edition_key}-L.jpg`
      : null;

    // Extract author names
    const authors = doc.author_name || [];
    const authorNames = Array.isArray(authors) ? authors : [authors];

    // Extract first publish year
    const firstPublishYear = doc.first_publish_year
      ? parseInt(doc.first_publish_year)
      : null;

    // Extract subjects
    const subjects = doc.subject || [];
    const normalizedSubjects = Array.isArray(subjects)
      ? subjects.slice(0, 5) // Limit to first 5 subjects
      : [subjects];

    // Extract Open Library key
    const openLibraryKey = doc.key?.replace("/works/", "") || null;

    return {
      id: doc.key || null,
      openLibraryKey,
      title: doc.title || "Unknown Title",
      authors: authorNames,
      authorNames, // Alias for compatibility
      description: null, // Description not available in search results
      coverImage,
      firstPublishYear,
      subjects: normalizedSubjects,
      isbn: doc.isbn?.[0] || null,
      publisher: doc.publisher?.[0] || null,
      publishDate: doc.publish_date?.[0] || null,
      pageCount: doc.number_of_pages_median || null,
      language: doc.language?.[0] || null,
      // Additional fields for compatibility
      genres: normalizedSubjects,
      category: normalizedSubjects[0] || null,
    };
  }
}

export default new OpenLibraryService();
