import mongoose from "mongoose";

const isbnRegex = /^(97(8|9))?\\d{9}(\\d|X)$/; // Simple ISBN-10/13 regex

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [2, "Title must be at least 2 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
      index: true,
    },
    authors: {
      type: [{ type: String, trim: true, minlength: 2, maxlength: 100 }],
      // Allow empty or missing
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    publishedDate: {
      type: Date,
      validate: {
        validator: (v) => !v || v <= new Date(),
        message: "Published date cannot be in the future",
      },
    },
    publisher: {
      type: String,
      trim: true,
      maxlength: [100, "Publisher name too long"],
    },
    isbn: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
      match: [isbnRegex, "Invalid ISBN format"],
    },
    pageCount: {
      type: Number,
      min: [1, "Page count must be at least 1"],
      max: [10000, "Page count is too high"],
    },
    categories: {
      type: [{ type: String, trim: true, maxlength: 50 }],
      validate: {
        validator: (arr) => !arr || arr.length <= 10,
        message: "No more than 10 categories allowed",
      },
    },
    language: {
      type: String,
      trim: true,
      default: "en",
      enum: ["en", "es", "fr", "de", "it", "pt", "zh", "ja", "ru"], // Add more as needed
    },
    coverImage: {
      type: String,
      trim: true,
      match: [
        /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|svg))$/i,
        "Invalid image URL",
      ],
    },
    price: {
      type: Number,
      min: [0, "Price cannot be negative"],
      max: [10000, "Price is too high"],
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    ratingsCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    externalId: { type: String, trim: true, index: true },
    bookmarkedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// Text index for search
bookSchema.index({ title: "text", authors: "text", description: "text" });

// Static method to find books by title
bookSchema.statics.findByTitle = function (title) {
  return this.find({ title: new RegExp(title, "i") });
};

// Static method to find books by author
bookSchema.statics.findByAuthor = function (author) {
  return this.find({ authors: new RegExp(author, "i") });
};

// Static method to find books by ISBN
bookSchema.statics.findByISBN = function (isbn) {
  return this.findOne({ isbn });
};

export default mongoose.model("Book", bookSchema);
