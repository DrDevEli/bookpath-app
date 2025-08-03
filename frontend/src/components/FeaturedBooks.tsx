import React from 'react';
import BookCard from './BookCard';

const featuredBooks = [
  {
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    cover: "https://covers.openlibrary.org/b/id/8225261-L.jpg",
    description: "A novel about the serious issues of rape and racial inequality.",
    price: 18.47
  },
  {
    title: "A Brief History of Time",
    author: "Stephen Hawking",
    cover: "https://covers.openlibrary.org/b/id/240726-L.jpg",
    description: "A landmark volume in science writing by one of the great minds of our time.",
    price: 15.50
  },
  {
    title: "Harry Potter and the Sorcerer's Stone",
    author: "J.K. Rowling",
    cover: "https://covers.openlibrary.org/b/id/7984916-L.jpg",
    description: "The first book in the Harry Potter series.",
    price: 15.75
  },
  {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    cover: "https://covers.openlibrary.org/b/id/7222161-L.jpg",
    description: "A story of the fabulously wealthy Jay Gatsby and his love for Daisy Buchanan.",
    price: 21.08
  },
  {
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    cover: "https://covers.openlibrary.org/b/id/6979861-L.jpg",
    description: "A fantasy novel and children's book by English author J. R. R. Tolkien.",
    price: 10.50
  },
  {
    title: "Sapiens: A Brief History of Humankind",
    author: "Yuval Noah Harari",
    cover: "https://covers.openlibrary.org/b/id/8235118-L.jpg",
    description: "Explores the history and impact of Homo sapiens.",
    price: 14.11
  },
];

export default function FeaturedBooks() {
  return (
    <div className="my-8">
      <h2 className="text-2xl font-bold mb-4">Featured Books</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {featuredBooks.map((book, idx) => (
          <BookCard
            key={idx}
            book={{
              id: `featured-${idx}`,
              title: book.title,
              authors: [book.author],
              coverImage: book.cover,
              description: book.description,
              price: book.price,
              openLibraryKey: '',
            }}
          />
        ))}
      </div>
    </div>
  );
} 