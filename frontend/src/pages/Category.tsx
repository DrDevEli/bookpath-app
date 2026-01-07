import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Mock categories and books
const categories = [
  'Fiction',
  'Non-Fiction',
  'Science',
  'History',
  'Biography',
  'Fantasy',
  'Mystery',
  'Romance',
  'Children',
];

type Book = { id: string; title: string; author: string };

const mockBooks: { [key: string]: Book[] } = {
  Fiction: [
    { id: '1', title: 'To Kill a Mockingbird', author: 'Harper Lee' },
    { id: '2', title: '1984', author: 'George Orwell' },
  ],
  Science: [
    { id: '3', title: 'A Brief History of Time', author: 'Stephen Hawking' },
    { id: '4', title: 'The Selfish Gene', author: 'Richard Dawkins' },
  ],
  // ... add more mock data as needed
};

export default function Category() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [books, setBooks] = useState<Book[]>([]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cat = e.target.value;
    setSelectedCategory(cat);
    setBooks(cat && mockBooks[cat] ? mockBooks[cat] : []);
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Search Books by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label htmlFor="category" className="block mb-2 font-medium">Select a category:</label>
            <select
              id="category"
              className="w-full border rounded px-3 py-2"
              value={selectedCategory}
              onChange={handleCategoryChange}
            >
              <option value="">-- Choose a category --</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          {selectedCategory && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Books in {selectedCategory}:</h3>
              {books.length > 0 ? (
                <ul className="space-y-2">
                  {books.map((book) => (
                    <li key={book.id} className="border rounded p-3">
                      <div className="font-medium">{book.title}</div>
                      <div className="text-sm text-gray-600">by {book.author}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-gray-500">No books found in this category.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 