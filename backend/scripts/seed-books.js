import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Book from '../src/models/Book.js';
import { loadJsonFile } from '../src/utils/jsonLoader.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set in environment');
  process.exit(1);
}

async function seedBooks() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const books = loadJsonFile('data/starter-books.json');
    if (!Array.isArray(books)) {
      throw new Error('starter-books.json must export an array of books');
    }

    // Remove existing books (optional, comment out if not desired)
    // await Book.deleteMany({});

    // Insert books
    const result = await Book.insertMany(books, { ordered: false });
    console.log(`Seeded ${result.length} books.`);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding books:', err);
    process.exit(1);
  }
}

seedBooks(); 