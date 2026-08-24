import BookCollection from "../models/BookCollection.js";
import { ApiError } from "../utils/errors.js";
import logger from "../config/logger.js";

const DEFAULT_LIBRARY_NAME = "My Library";

// Map shelf names to model readStatus values
const SHELF_TO_STATUS = {
  wantToRead: "to-read",
  reading: "reading",
  currentlyReading: "reading",
  completed: "completed",
  abandoned: "abandoned",
};

const STATUS_TO_SHELF = {
  "to-read": "wantToRead",
  reading: "currentlyReading",
  completed: "completed",
  abandoned: "abandoned",
  dnf: "abandoned",
};

class LibraryService {
  /**
   * Get or create the user's default "My Library" collection
   */
  async _getOrCreateDefaultCollection(userId) {
    let collection = await BookCollection.findOne({
      user: userId,
      name: DEFAULT_LIBRARY_NAME,
      category: "general",
    });

    if (!collection) {
      collection = await BookCollection.create({
        user: userId,
        name: DEFAULT_LIBRARY_NAME,
        description: "Your default book library",
        category: "general",
        books: [],
      });
      collection.updateStats();
      await collection.save();
      logger.info("Created default library collection", { userId, collectionId: collection._id });
    }

    return collection;
  }

  /**
   * Compute top N authors from books array
   */
  _computeTopAuthors(books, limit = 5) {
    const authorCounts = {};
    for (const book of books) {
      if (book.authors && Array.isArray(book.authors)) {
        for (const author of book.authors) {
          const name = author.trim();
          if (name) {
            authorCounts[name] = (authorCounts[name] || 0) + 1;
          }
        }
      }
    }
    return Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([author, count]) => ({ author, count }));
  }

  /**
   * Compute top N genres from books array
   */
  _computeTopGenres(books, limit = 5) {
    const genreCounts = {};
    for (const book of books) {
      if (book.genres && Array.isArray(book.genres)) {
        for (const genre of book.genres) {
          const name = genre.trim();
          if (name) {
            genreCounts[name] = (genreCounts[name] || 0) + 1;
          }
        }
      }
    }
    return Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([genre, count]) => ({ genre, count }));
  }

  /**
   * Compute reading streak — consecutive days with at least one book
   * completed or being read, looking back from today.
   */
  _computeReadingStreak(books) {
    // Collect all dates where user was actively reading or completed a book
    const activeDates = new Set();

    for (const book of books) {
      if (book.dateFinished) {
        const d = new Date(book.dateFinished);
        activeDates.add(d.toISOString().slice(0, 10));
      }
      if (book.dateStarted) {
        const d = new Date(book.dateStarted);
        activeDates.add(d.toISOString().slice(0, 10));
      }
      if (book.addedAt) {
        const d = new Date(book.addedAt);
        activeDates.add(d.toISOString().slice(0, 10));
      }
    }

    if (activeDates.size === 0) return 0;

    // Count consecutive days going backwards from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const key = checkDate.toISOString().slice(0, 10);

      if (activeDates.has(key)) {
        streak++;
      } else {
        // Allow a one-day gap (grace period)
        if (i < 365) {
          const nextDate = new Date(today);
          nextDate.setDate(nextDate.getDate() - (i + 1));
          const nextKey = nextDate.toISOString().slice(0, 10);
          if (activeDates.has(nextKey)) {
            streak++;
            i++; // skip the gap day
            continue;
          }
        }
        break;
      }
    }

    return streak;
  }

  /**
   * Aggregate all user books into shelves and compute stats.
   * getLibrary(userId) -> { books, shelves, stats, collections }
   */
  async getLibrary(userId) {
    try {
      const collection = await this._getOrCreateDefaultCollection(userId);
      const books = collection.books || [];

      // Build shelves
      const shelves = {
        wantToRead: [],
        currentlyReading: [],
        completed: [],
        favorites: [],
        abandoned: [],
      };

      for (const book of books) {
        const shelfKey = STATUS_TO_SHELF[book.readStatus] || "wantToRead";
        if (shelves[shelfKey]) {
          shelves[shelfKey].push(book);
        }
        if (book.favorite) {
          shelves.favorites.push(book);
        }
      }

      // Compute stats
      const completedBooks = shelves.completed.length;
      const totalBooks = books.length;
      const totalPages = books.reduce((sum, b) => sum + (b.pageCount || 0), 0);

      const ratedBooks = books.filter((b) => b.rating);
      const averageRating =
        ratedBooks.length > 0
          ? Math.round(
              (ratedBooks.reduce((sum, b) => sum + b.rating, 0) /
                ratedBooks.length) *
                100
            ) / 100
          : 0;

      const topAuthors = this._computeTopAuthors(books);
      const topGenres = this._computeTopGenres(books);
      const readingStreak = this._computeReadingStreak(books);

      const stats = {
        totalBooks,
        completedBooks,
        totalPages,
        averageRating,
        topAuthors,
        topGenres,
        readingStreak,
      };

      logger.info("Library aggregated", { userId, totalBooks, completedBooks });

      // Build collections summary (all user collections incl. the default library)
      const allCollections = await BookCollection.find({ user: userId });
      const collections = allCollections.map((c) => ({
        _id: c._id,
        name: c.name,
        description: c.description,
        category: c.category,
        color: c.color,
        isPublic: c.isPublic,
        bookCount: c.books.length,
        completedCount: c.books.filter((b) => b.readStatus === "completed").length,
      }));

      return { books, shelves, stats, collections };
    } catch (error) {
      logger.error("getLibrary error", { userId, error: error.message });
      throw new ApiError(`Library aggregation failed: ${error.message}`, 500);
    }
  }

  /**
   * Add a book to the user's library with the specified shelf/readStatus.
   * addToLibrary(userId, book, shelf)
   * shelf: 'wantToRead' | 'reading' | 'completed'
   */
  async addToLibrary(userId, book, shelf = "wantToRead") {
    try {
      if (!book || !book.bookId || !book.title) {
        throw new ApiError("Book with bookId and title is required", 400);
      }

      const readStatus = SHELF_TO_STATUS[shelf] || "to-read";

      const collection = await this._getOrCreateDefaultCollection(userId);

      // Check if book already exists
      const exists = collection.books.some((b) => b.bookId === book.bookId);
      if (exists) {
        throw new ApiError("Book already exists in your library", 400);
      }

      // Set dateStarted if the book is being read now
      let dateStarted = book.dateStarted || undefined;
      if (readStatus === "reading" && !dateStarted) {
        dateStarted = new Date();
      }

      // Set dateFinished if completed
      let dateFinished = book.dateFinished || undefined;
      if (readStatus === "completed" && !dateFinished) {
        dateFinished = new Date();
      }

      const bookData = {
        bookId: book.bookId,
        title: book.title,
        authors: book.authors || [],
        coverImage: book.coverImage || undefined,
        publisher: book.publisher || undefined,
        publishedDate: book.publishedDate || undefined,
        pageCount: book.pageCount || undefined,
        isbn: book.isbn || undefined,
        language: book.language || undefined,
        genres: book.genres || [],
        notes: book.notes || undefined,
        rating: book.rating || undefined,
        readStatus,
        dateStarted,
        dateFinished,
        progress: book.progress || 0,
        favorite: book.favorite || false,
        personalTags: book.personalTags || [],
      };

      collection.books.push(bookData);
      collection.updateStats();
      await collection.save();

      logger.info("Book added to library", {
        userId,
        bookId: book.bookId,
        shelf,
        readStatus,
      });

      return bookData;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("addToLibrary error", { userId, error: error.message });
      throw new ApiError(`Failed to add book: ${error.message}`, 500);
    }
  }

  /**
   * Update a book's status, progress, rating, or favorite flag.
   * updateBookStatus(userId, bookId, updates)
   */
  async updateBookStatus(userId, bookId, updates) {
    try {
      if (!bookId) {
        throw new ApiError("bookId is required", 400);
      }

      const collection = await this._getOrCreateDefaultCollection(userId);

      const bookIndex = collection.books.findIndex(
        (b) => b.bookId === bookId
      );
      if (bookIndex === -1) {
        throw new ApiError("Book not found in your library", 404);
      }

      const book = collection.books[bookIndex];

      // Map shelf name to readStatus if provided
      if (updates.readStatus !== undefined) {
        const mapped = SHELF_TO_STATUS[updates.readStatus] || updates.readStatus;
        book.readStatus = mapped;

        if (mapped === "reading" && !book.dateStarted) {
          book.dateStarted = new Date();
        }
        if (mapped === "completed" && !book.dateFinished) {
          book.dateFinished = new Date();
        }
      }

      if (updates.progress !== undefined) {
        book.progress = Math.min(100, Math.max(0, updates.progress));
      }

      if (updates.rating !== undefined) {
        book.rating = Math.min(5, Math.max(1, updates.rating));
      }

      if (updates.favorite !== undefined) {
        book.favorite = !!updates.favorite;
      }

      if (updates.notes !== undefined) {
        book.notes = updates.notes;
      }

      if (updates.personalTags !== undefined) {
        book.personalTags = updates.personalTags;
      }

      if (updates.dateStarted !== undefined) {
        book.dateStarted = updates.dateStarted;
      }

      if (updates.dateFinished !== undefined) {
        book.dateFinished = updates.dateFinished;
      }

      collection.updateStats();
      await collection.save();

      logger.info("Book status updated in library", {
        userId,
        bookId,
        readStatus: book.readStatus,
      });

      return book;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("updateBookStatus error", { userId, bookId, error: error.message });
      throw new ApiError(`Failed to update book: ${error.message}`, 500);
    }
  }

  /**
   * Remove a book from the user's library (all collections).
   * removeFromLibrary(userId, bookId)
   */
  async removeFromLibrary(userId, bookId) {
    try {
      if (!bookId) {
        throw new ApiError("bookId is required", 400);
      }

      // Remove from all collections owned by the user
      const collections = await BookCollection.find({ user: userId });

      let removed = false;
      for (const collection of collections) {
        const idx = collection.books.findIndex((b) => b.bookId === bookId);
        if (idx !== -1) {
          collection.books.splice(idx, 1);
          collection.updateStats();
          await collection.save();
          removed = true;
          logger.info("Book removed from collection", {
            userId,
            bookId,
            collectionId: collection._id,
          });
        }
      }

      if (!removed) {
        throw new ApiError("Book not found in any of your collections", 404);
      }

      return { removed: true, bookId };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("removeFromLibrary error", { userId, bookId, error: error.message });
      throw new ApiError(`Failed to remove book: ${error.message}`, 500);
    }
  }

  /**
   * Get just the library stats without full shelves.
   */
  async getLibraryStats(userId) {
    try {
      const { stats } = await this.getLibrary(userId);
      return stats;
    } catch (error) {
      logger.error("getLibraryStats error", { userId, error: error.message });
      throw error;
    }
  }
}

export default new LibraryService();
