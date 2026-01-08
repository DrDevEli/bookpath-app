import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookCardSkeletonGrid } from '@/components/BookCardSkeleton';
import BookCard from '@/components/BookCard';
import api from '../api';
import { isAuthenticated } from '../auth';

// Available categories matching backend normalization
const categories = [
  'Fiction',
  'Non-fiction',
  'Sci-Fi',
  'Fantasy',
  'Mystery',
  'Romance',
  'History',
  'Biography',
  'Self-Help',
  'Business',
  'Tech',
];

interface Book {
  id: string;
  title: string;
  authors: string[];
  coverImage?: string;
  description?: string;
  firstPublishYear?: number;
  openLibraryKey?: string;
  category?: string;
  price?: number;
  condition?: 'new' | 'used' | 'unknown';
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function Category() {
  const { category: categoryParam } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || '');
  const [books, setBooks] = useState<Book[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const isLoggedIn = isAuthenticated();

  const fetchBooksByCategory = useCallback(async (category: string, pageNum: number = 1) => {
    if (!category) {
      setBooks([]);
      setPagination(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/books/category/${encodeURIComponent(category)}`, {
        params: { page: pageNum },
      });

      if (response.data.success) {
        setBooks(response.data.data || []);
        setPagination(response.data.pagination || null);
        setPage(pageNum);
      } else {
        setError(response.data.error || 'Failed to fetch books');
        setBooks([]);
      }
    } catch (err: any) {
      console.error('Category search error:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to fetch books';
      setError(typeof errorMessage === 'string' ? errorMessage : String(errorMessage));
      setBooks([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
      fetchBooksByCategory(categoryParam, 1);
    }
  }, [categoryParam, fetchBooksByCategory]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cat = e.target.value;
    setSelectedCategory(cat);
    setPage(1);
    
    if (cat) {
      // Update URL without navigation
      navigate(`/category/${encodeURIComponent(cat)}`, { replace: true });
      fetchBooksByCategory(cat, 1);
    } else {
      navigate('/category', { replace: true });
      setBooks([]);
      setPagination(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (selectedCategory) {
      fetchBooksByCategory(selectedCategory, newPage);
      // Scroll to top when page changes
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl" style={{ color: 'rgb(30, 41, 59)' }}>
            Discover Books by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label htmlFor="category" className="block mb-2 font-medium" style={{ color: 'rgb(30, 41, 59)' }}>
              Select a category:
            </label>
            <select
              id="category"
              className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 bg-white"
              value={selectedCategory}
              onChange={handleCategoryChange}
              style={{ color: 'rgb(30, 41, 59)' }}
            >
              <option value="">-- Choose a category --</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {selectedCategory && (
        <div>
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'rgb(30, 41, 59)' }}>
            {selectedCategory} Books
            {pagination && (
              <span className="text-lg font-normal ml-2" style={{ color: 'rgb(30, 41, 59)' }}>
                ({pagination.totalResults} {pagination.totalResults === 1 ? 'book' : 'books'})
              </span>
            )}
          </h2>

          {loading && <BookCardSkeletonGrid count={12} />}

          {error && !loading && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <p className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && books.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center" style={{ color: 'rgb(30, 41, 59)' }}>
                  No books found in this category. Try another category.
                </p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && books.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
                {books.map((book) => (
                  <BookCard
                    key={book.id || book.openLibraryKey || book.title}
                    book={book}
                    isLoggedIn={isLoggedIn}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={!pagination.hasPreviousPage || loading}
                    className="transition-all duration-300"
                  >
                    Previous
                  </Button>
                  
                  <span className="px-4 py-2" style={{ color: 'rgb(30, 41, 59)' }}>
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={!pagination.hasNextPage || loading}
                    className="transition-all duration-300"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!selectedCategory && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center" style={{ color: 'rgb(30, 41, 59)' }}>
              Please select a category to discover books.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
