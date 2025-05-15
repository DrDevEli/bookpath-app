// Add title, author, summary, tags, etc.
import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  summary: String,
  tags: [String],
  externalId: String,
  bookmarkedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model('Book', bookSchema);
