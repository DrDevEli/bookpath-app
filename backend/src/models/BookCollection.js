import mongoose from "mongoose";
import logger from "../config/logger.js";

const bookCollectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    books: [
      {
        bookId: {
          type: String,
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        authors: [String],
        coverImage: String,
        publisher: String,
        publishedDate: String,
        pageCount: Number,
        isbn: String,
        language: String,
        genres: [String],
        addedAt: {
          type: Date,
          default: Date.now,
        },
        notes: {
          type: String,
          maxlength: 1000,
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        readStatus: {
          type: String,
          enum: ["to-read", "reading", "completed", "abandoned", "dnf"],
          default: "to-read",
        },
        dateStarted: {
          type: Date,
        },
        dateFinished: {
          type: Date,
        },
        progress: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
        favorite: {
          type: Boolean,
          default: false,
        },
        personalTags: [String],
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
    category: {
      type: String,
      enum: ["general", "wishlist", "favorites", "currently-reading", "completed", "custom"],
      default: "general",
    },
    color: {
      type: String,
      default: "#3B82F6", // Default blue color
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, // Hex color validation
    },
    sortBy: {
      type: String,
      enum: ["addedAt", "title", "author", "rating", "dateFinished"],
      default: "addedAt",
    },
    sortOrder: {
      type: String,
      enum: ["asc", "desc"],
      default: "desc",
    },
    shareableLink: {
      type: String,
      unique: true,
      sparse: true, // Only enforce uniqueness for non-null values
    },
    collaborators: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["viewer", "editor"],
          default: "viewer",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    stats: {
      totalBooks: {
        type: Number,
        default: 0,
      },
      completedBooks: {
        type: Number,
        default: 0,
      },
      averageRating: {
        type: Number,
        default: 0,
      },
      totalPages: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
bookCollectionSchema.index({ user: 1, name: 1 }, { unique: true });
bookCollectionSchema.index({ "books.bookId": 1 });
bookCollectionSchema.index({ isPublic: 1 });
bookCollectionSchema.index({ category: 1 });
bookCollectionSchema.index({ tags: 1 });
bookCollectionSchema.index({ shareableLink: 1 });
bookCollectionSchema.index({ "collaborators.user": 1 });
bookCollectionSchema.index({ "books.readStatus": 1 });
bookCollectionSchema.index({ "books.favorite": 1 });

// Virtual for book count
bookCollectionSchema.virtual("bookCount").get(function () {
  return this.books.length;
});

// Method to add a book to collection
bookCollectionSchema.methods.addBook = function (book) {
  // Check if book already exists
  const exists = this.books.some((b) => b.bookId === book.bookId);
  if (!exists) {
    this.books.push(book);
    this.updateStats();
  }
  return this;
};

// Method to remove a book from collection
bookCollectionSchema.methods.removeBook = function (bookId) {
  this.books = this.books.filter((book) => book.bookId !== bookId);
  this.updateStats();
  return this;
};

// Method to update collection statistics
bookCollectionSchema.methods.updateStats = function () {
  this.stats.totalBooks = this.books.length;
  this.stats.completedBooks = this.books.filter(book => book.readStatus === 'completed').length;
  
  const ratedBooks = this.books.filter(book => book.rating);
  this.stats.averageRating = ratedBooks.length > 0 
    ? ratedBooks.reduce((sum, book) => sum + book.rating, 0) / ratedBooks.length 
    : 0;
  
  this.stats.totalPages = this.books.reduce((sum, book) => sum + (book.pageCount || 0), 0);
  
  return this;
};

// Method to get books by status
bookCollectionSchema.methods.getBooksByStatus = function (status) {
  return this.books.filter(book => book.readStatus === status);
};

// Method to get favorite books
bookCollectionSchema.methods.getFavoriteBooks = function () {
  return this.books.filter(book => book.favorite);
};

// Method to generate shareable link
bookCollectionSchema.methods.generateShareableLink = function () {
  if (!this.shareableLink) {
    this.shareableLink = require('crypto').randomBytes(16).toString('hex');
  }
  return this.shareableLink;
};

// Method to sort books
bookCollectionSchema.methods.getSortedBooks = function () {
  const books = [...this.books];
  const sortBy = this.sortBy;
  const sortOrder = this.sortOrder;
  
  books.sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case 'author':
        aValue = a.authors[0]?.toLowerCase() || '';
        bValue = b.authors[0]?.toLowerCase() || '';
        break;
      case 'rating':
        aValue = a.rating || 0;
        bValue = b.rating || 0;
        break;
      case 'dateFinished':
        aValue = a.dateFinished || new Date(0);
        bValue = b.dateFinished || new Date(0);
        break;
      default: // addedAt
        aValue = a.addedAt;
        bValue = b.addedAt;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
  
  return books;
};

// Logging middleware
bookCollectionSchema.post("save", function (doc) {
  logger.info("Collection saved", {
    collectionId: doc._id,
    userId: doc.user,
    bookCount: doc.books.length,
  });
});

const BookCollection = mongoose.model("BookCollection", bookCollectionSchema);

export default BookCollection;
