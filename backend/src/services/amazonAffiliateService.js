import logger from "../config/logger.js";

class AmazonAffiliateService {
  constructor() {
    this.defaultMarket = (process.env.AMAZON_DEFAULT_MARKET || "de").toLowerCase();

    // Marketplace map: market code -> { domain, tag }.
    // DE is always present (existing env). US is opt-in — active only when a US tag is configured.
    this.marketplaces = {
      de: {
        domain: process.env.AMAZON_DOMAIN || "amazon.de",
        tag: process.env.AMAZON_ASSOCIATES_TAG || null,
      },
    };
    if (process.env.AMAZON_US_ASSOCIATES_TAG) {
      this.marketplaces.us = {
        domain: process.env.AMAZON_US_DOMAIN || "amazon.com",
        tag: process.env.AMAZON_US_ASSOCIATES_TAG,
      };
    }

    // Backward-compat properties (default = DE marketplace)
    this.associateTag = this.marketplaces.de.tag;
    this.amazonDomain = this.marketplaces.de.domain;

    if (!this.associateTag) {
      logger.warn(
        "Amazon Associates tag not configured. Affiliate links will not be generated."
      );
    }
  }

  /**
   * Resolve a market code to its { domain, tag }. Invalid/unknown codes
   * fall back to the default market so a bad ?market= can never kill a link.
   * @param {string} [market] - Market code ("de" | "us")
   * @returns {{domain: string, tag: string|null}|null}
   */
  getMarket(market) {
    const key = (market || this.defaultMarket || "de").toLowerCase();
    return this.marketplaces[key] || this.marketplaces[this.defaultMarket] || null;
  }

  /**
   * List market codes that have a configured tag.
   * @returns {string[]}
   */
  availableMarkets() {
    return Object.entries(this.marketplaces)
      .filter(([, m]) => !!m.tag)
      .map(([code]) => code);
  }

  /**
   * Generate Amazon affiliate link for a book
   * @param {Object} params - Book parameters
   * @param {string} params.title - Book title
   * @param {string[]} [params.authors] - Array of author names
   * @param {string} [params.market] - Target marketplace ("de" | "us", default from env)
   * @returns {Promise<string|null>} Amazon affiliate URL or null if tag not configured
   */
  async generateAffiliateLink({ title, authors = [], market }) {
    const m = this.getMarket(market);
    if (!m || !m.tag) {
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
      // Format: https://<domain>/s?k=search+query&tag=associate_tag
      const affiliateUrl = `https://${m.domain}/s?k=${encodedQuery}&tag=${m.tag}`;

      logger.debug("Generated Amazon affiliate link", {
        title,
        authors,
        domain: m.domain,
        market: (market || this.defaultMarket).toLowerCase(),
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
   * Get estimated book price based on metadata.
   * Since real-time Amazon scraping is unreliable without API access,
   * this builds a reasonable price estimate based on book attributes.
   *
   * @param {Object} book - Book metadata
   * @param {string} book.title - Book title
   * @param {string[]} [book.authors] - Author names
   * @param {number} [book.pageCount] - Number of pages
   * @param {string|number} [book.publishedDate] - Publication date (year or ISO string)
   * @param {string} [book.publisher] - Publisher name
   * @param {number} [book.averageRating] - Average rating (for bestseller premium)
   * @param {number} [book.ratingsCount] - Rating count (for bestseller detection)
   * @returns {Promise<Object>} Price estimate { amount, currency, format, url, confidence }
   */
  async getBookPrice(book) {
    const { title, authors, pageCount, publishedDate, publisher, averageRating, ratingsCount } = book;

    // Generate affiliate link URL
    const url = await this.generateAffiliateLink({ title, authors: authors || [] });

    // Estimate base price from page count
    const pages = pageCount || 250; // default 250 pages if unknown
    const pricePerPage = 0.08 + Math.random() * 0.07; // 0.08-0.15 EUR per page
    let basePrice = pages * pricePerPage;

    // Apply age discount for books older than 1 year
    if (publishedDate) {
      const pubYear = typeof publishedDate === 'number'
        ? publishedDate
        : parseInt(String(publishedDate).match(/^(\d{4})/)?.[1] || publishedDate);
      const currentYear = new Date().getFullYear();
      const age = currentYear - pubYear;
      if (age > 1) {
        const discountFactor = 0.70 - Math.min(age * 0.02, 0.30); // 30-70% discount, max 50% reduction
        basePrice *= Math.max(discountFactor, 0.50);
      }
    }

    // Bestseller premium: high ratings + many reviews
    const isBestseller = averageRating >= 4.0 && ratingsCount >= 100;
    if (isBestseller) {
      basePrice *= 1.15; // 15% premium
    }

    // Build format options with different multipliers
    const formats = {
      paperback: {
        amount: Math.round(basePrice * 1.0 * 100) / 100,
        currency: 'EUR',
        format: 'paperback',
        url,
        confidence: 'estimated',
      },
      hardcover: {
        amount: Math.round(basePrice * 1.6 * 100) / 100,
        currency: 'EUR',
        format: 'hardcover',
        url,
        confidence: 'estimated',
      },
      kindle: {
        amount: Math.round(basePrice * 0.65 * 100) / 100,
        currency: 'EUR',
        format: 'kindle',
        url,
        confidence: 'estimated',
      },
    };

    return formats;
  }

  /**
   * Get a single price estimate (defaulting to paperback) for a book.
   * Convenience method for simple use cases.
   *
   * @param {Object} book - Book metadata
   * @returns {Promise<Object>} Single price estimate
   */
  async getBookPriceSingle(book) {
    const formats = await this.getBookPrice(book);
    return formats.paperback;
  }

  /**
   * Enrich an array of books with Amazon price estimates.
   * Adds both amazonLink and price fields to each book.
   *
   * @param {Array} books - Array of book objects
   * @returns {Promise<Array>} Books enriched with amazonLink and price
   */
  async enrichBooksWithPrices(books) {
    if (!Array.isArray(books) || books.length === 0) {
      return books;
    }

    try {
      const enriched = await Promise.all(
        books.map(async (book) => {
          // Skip if fully enriched already
          if (book.price && book.amazonLink) {
            return book;
          }

          const priceFormats = await this.getBookPrice(book);
          const amazonLink = priceFormats.paperback.url;

          return {
            ...book,
            amazonLink,
            price: priceFormats,
          };
        })
      );

      logger.debug("Enriched books with Amazon price estimates", {
        bookCount: enriched.length,
        enrichedCount: enriched.filter((b) => b.price).length,
      });

      return enriched;
    } catch (error) {
      logger.error("Error enriching books with prices", {
        error: error.message,
        bookCount: books.length,
      });

      return books.map((book) => ({
        ...book,
        amazonLink: null,
        price: null,
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
