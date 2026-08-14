import React, { useState, useEffect, useCallback } from 'react';
import BookCard from './BookCard';
import { analyticsAPI } from '../api';

interface TrendingBook {
  bookId: string;
  title: string;
  authors?: string[];
  coverImage?: string;
  clicks: number;
}

/**
 * TrendingBooks — the top-converting section.
 *
 * Backed by real affiliate click data (/analytics/trending). Books are ranked
 * by click-through count, which is a leading signal of purchase intent. Renders
 * nothing when there's no click data yet (honest empty state) so we never show
 * a fake "trending" list.
 */
export default function TrendingBooks() {
  const [books, setBooks] = useState<TrendingBook[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrending = useCallback(async () => {
    try {
      const res = await analyticsAPI.getTrending(8);
      const data = res.data?.data;
      setBooks(Array.isArray(data) ? data : []);
    } catch {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  if (loading) return null;
  if (books.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4">
      {books.map((book) => (
        <BookCard
          key={book.bookId}
          book={{
            id: book.bookId,
            title: book.title,
            authors: book.authors || [],
            coverImage: book.coverImage,
          }}
          source="trending"
        />
      ))}
    </div>
  );
}
