import logger from "../config/logger.js";

class AmazonAffiliateService {
  constructor() {
    this.associateTag = process.env.AMAZON_ASSOCIATES_TAG || null;
    this.amazonDomain = process.env.AMAZON_DOMAIN || "amazon.de";
    
    if (!this.associateTag) {
      logger.warn(
        "Amazon Associates tag not configured. Affiliate links will not be generated."
      );
    }
  }

  /**
   * Generate Amazon affiliate link for a book
   * @param {Object} params - Book parameters
   * @param {string} params.title - Book title
   * @param {string[]} [params.authors] - Array of author names
   * @returns {Promise<string|null>} Amazon affiliate URL or null if tag not configured
   */
  async generateAffiliateLink({ title, authors = [] }) {
    if (!this.associateTag) {
      logger.debug("Amazon Associates tag not configured, skipping affiliate link");
      return null;
    }

    if (!title) {
      logger.warn("Cannot generate affiliate link: title is required");
      return null;
    }

    try {
      // Build search query
      let searchQuery = title;
      
      // Add author to search query if available
      if (authors && authors.length > 0) {
        const authorName = Array.isArray(authors) ? authors[0] : authors;
        searchQuery = `${title} ${authorName}`;
      }

      // Encode the search query
      const encodedQuery = encodeURIComponent(searchQuery.trim());

      // Build Amazon search URL with affiliate tag
      // Format: https://amazon.de/s?k=search+query&tag=associate_tag
      const affiliateUrl = `https://${this.amazonDomain}/s?k=${encodedQuery}&tag=${this.associateTag}`;

      logger.debug("Generated Amazon affiliate link", {
        title,
        authors,
        domain: this.amazonDomain,
      });

      return affiliateUrl;
    } catch (error) {
      logger.error("Error generating Amazon affiliate link", {
        error: error.message,
        title,
        authors,
      });
      return null;
    }
  }

  /**
   * Add Amazon affiliate links to an array of books
   * @param {Array} books - Array of book objects
   * @returns {Promise<Array>} Books with amazonLink property added
   */
  async addAffiliateLinksToBooks(books) {
    if (!Array.isArray(books) || books.length === 0) {
      return books;
    }

    if (!this.associateTag) {
      logger.debug("Amazon Associates tag not configured, skipping affiliate links");
      // Return books with null amazonLink
      return books.map((book) => ({
        ...book,
        amazonLink: null,
      }));
    }

    try {
      // Process books in parallel for better performance
      const booksWithLinks = await Promise.all(
        books.map(async (book) => {
          // Skip if book already has an affiliate link
          if (book.amazonLink) {
            return book;
          }

          // Generate affiliate link
          const amazonLink = await this.generateAffiliateLink({
            title: book.title,
            authors: book.authors || book.authorNames || [],
          });

          return {
            ...book,
            amazonLink,
          };
        })
      );

      logger.debug("Added affiliate links to books", {
        bookCount: booksWithLinks.length,
        linksGenerated: booksWithLinks.filter((b) => b.amazonLink).length,
      });

      return booksWithLinks;
    } catch (error) {
      logger.error("Error adding affiliate links to books", {
        error: error.message,
        bookCount: books.length,
      });

      // Return books without affiliate links on error
      return books.map((book) => ({
        ...book,
        amazonLink: null,
      }));
    }
  }

  /**
   * Check if Amazon Associates is configured
   * @returns {boolean} True if associate tag is configured
   */
  isConfigured() {
    return !!this.associateTag;
  }

  /**
   * Get the configured Amazon domain
   * @returns {string} Amazon domain (e.g., "amazon.de", "amazon.com")
   */
  getDomain() {
    return this.amazonDomain;
  }
}

export default new AmazonAffiliateService();
