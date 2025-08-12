import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from "@/hooks/use-toast";
import { BookCardSkeletonGrid } from './BookCardSkeleton';
import BookCard from './BookCard';
import api from '../api';
import { isAuthenticated } from '../auth';

interface BookSearchForm {
  title: string;
  author: string;
}

interface Book {
  id: string;
  title: string;
  authors: string[];
  firstPublishYear?: number;
  coverImage?: string;
  editionCount?: number;
  hasFullText?: boolean;
  ratingsAverage?: number;
  ratingsCount?: number;
  openLibraryKey: string;
  price?: number; // <-- Add this line
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface Collection {
  _id: string;
  name: string;
  description?: string;
}

const addToCollectionSchema = z.object({
  collectionId: z.string().min(1, 'Please select a collection'),
  notes: z.string().max(500, 'Notes too long').optional(),
  readStatus: z.enum(['to-read', 'reading', 'completed', 'abandoned']),
});

type AddToCollectionForm = z.infer<typeof addToCollectionSchema>;

export function BookSearch() {
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('');
  const [condition, setCondition] = useState<string>(''); // '', 'new', 'used'
  const [sort, setSort] = useState<string>(''); // '', 'newest', 'author_az'
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showAddToCollection, setShowAddToCollection] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [amazonOnly, setAmazonOnly] = useState<boolean>(false);
  const [lastSearchParams, setLastSearchParams] = useState<Record<string, string>>({});
  const [lastEndpoint, setLastEndpoint] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isLoggedIn = isAuthenticated();
  const { toast } = useToast();

  const { register, handleSubmit, getValues } = useForm<BookSearchForm>();
  const {
    register: registerCollection,
    handleSubmit: handleCollectionSubmit,
    formState: { errors: collectionErrors },
    reset: resetCollection,
  } = useForm<AddToCollectionForm>({
    resolver: zodResolver(addToCollectionSchema),
    defaultValues: {
      readStatus: 'to-read',
    },
  });

  useEffect(() => {
    if (isLoggedIn) {
      fetchCollections();
    }
  }, [isLoggedIn]);

  const fetchCollections = async () => {
    try {
      // GET /collections — list user's collections
      const response = await api.get('/collections');
      if (response.data.success) {
        setCollections(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch collections:', err);
    }
  };

  const onSubmit = async (data: BookSearchForm) => {
    setLoading(true);
    setError(null);
    setSearchResults([]);
    setPagination(null);
    
    try {
      const params = new URLSearchParams();
      if (data.title) params.append('title', data.title);
      if (data.author) params.append('author', data.author);
      if (category) params.append('category', category);
      if (condition) params.append('condition', condition);
      if (sort) params.append('sort', sort);
      if (priceMin) params.append('priceMin', priceMin);
      if (priceMax) params.append('priceMax', priceMax);
      if (amazonOnly) params.append('amazonOnly', 'true');

      // Save for pagination reuse
      setLastSearchParams(Object.fromEntries(params.entries()));
      setLastEndpoint('/books/search');

      // GET /books/search — search books
      const response = await api.get(`/books/search?${params.toString()}`);
      
      if (response.data.success) {
        setSearchResults(response.data.data || []);
        setPagination(response.data.pagination || null);

        if (!response.data.data || response.data.data.length === 0) {
          setError("No books found matching your search.");
          toast({
            variant: "info",
            title: "No Results",
            description: "No books found matching your search criteria.",
          });
        } else {
          toast({
            variant: "success",
            title: "Search Complete",
            description: `Found ${response.data.data.length} books matching your search.`,
          });
        }
      } else {
        setError("Search failed. Please try again.");
        toast({
          variant: "destructive",
          title: "Search Failed",
          description: "Unable to complete your search. Please try again.",
        });
      }
    } catch (err: any) {
      console.error("Search error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Error fetching books.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Search Error",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const onAdvancedSearch = async () => {
    setLoading(true);
    setError(null);
    setSearchResults([]);
    setPagination(null);

    try {
      const values = getValues();
      const params = new URLSearchParams();
      if (values.title) params.append('title', values.title);
      if (values.author) params.append('author', values.author);
      if (category) params.append('genre', category);

      // Save for pagination reuse (advanced endpoint supports page)
      setLastSearchParams(Object.fromEntries(params.entries()));
      setLastEndpoint('/books/search/advanced');

      const response = await api.get(`/books/search/advanced?${params.toString()}`);

      if (response.data.success) {
        setSearchResults(response.data.data || []);
        setPagination(response.data.pagination || null);

        if (!response.data.data || response.data.data.length === 0) {
          setError("No books found matching your advanced search.");
          toast({
            variant: "info",
            title: "No Results",
            description: "No books found matching your advanced search criteria.",
          });
        } else {
          toast({
            variant: "success",
            title: "Advanced Search Complete",
            description: `Found ${response.data.data.length} books matching your advanced search.`,
          });
        }
      } else {
        setError("Advanced search failed. Please try again.");
        toast({
          variant: "destructive",
          title: "Advanced Search Failed",
          description: "Unable to complete your advanced search. Please try again.",
        });
      }
    } catch (err: any) {
      console.error("Advanced search error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Error fetching books.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Advanced Search Error",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!pagination || !pagination.hasNextPage || loadingMore || !lastEndpoint) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams(lastSearchParams);
      const nextPage = (pagination.currentPage || 1) + 1;
      params.set('page', nextPage.toString());

      const response = await api.get(`${lastEndpoint}?${params.toString()}`);
      if (response.data.success) {
        const more = response.data.data || [];
        setSearchResults(prev => [...prev, ...more]);
        setPagination(response.data.pagination || null);
      }
    } catch (err: any) {
      console.error("Load more error:", err);
      toast({
        variant: "destructive",
        title: "Load More Error",
        description: "Failed to load additional results.",
      });
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const sentinel = loadMoreRef.current;
    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting) {
        loadMore();
      }
    }, { root: null, rootMargin: '400px', threshold: 0 });
    observer.observe(sentinel);
    return () => {
      observer.unobserve(sentinel);
      observer.disconnect();
    };
  }, [pagination, lastEndpoint, lastSearchParams]);

  const handleAddToCollection = async (book: Book, data: AddToCollectionForm) => {
    try {
      setAdding(true);
      // POST /collections/:collectionId/books — add book to collection
      const response = await api.post(`/collections/${data.collectionId}/books`, {
        bookId: book.id,
        title: book.title,
        authors: book.authors,
        coverImage: book.coverImage,
        notes: data.notes,
        readStatus: data.readStatus,
      });

      if (response.data.success) {
        setShowAddToCollection(null);
        resetCollection();
        setError(null);
        toast({
          variant: "success",
          title: "Book Added",
          description: `${book.title} has been added to your collection.`,
        });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to add book to collection';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Add Failed",
        description: errorMessage,
      });
    } finally {
      setAdding(false);
    }
  };

  const toggleFavorite = (bookId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(bookId)) {
        newFavorites.delete(bookId);
        toast({
          variant: "info",
          title: "Removed from Favorites",
          description: "Book removed from your favorites.",
        });
      } else {
        newFavorites.add(bookId);
        toast({
          variant: "success",
          title: "Added to Favorites",
          description: "Book added to your favorites!",
        });
      }
      return newFavorites;
    });
  };



  return (
    <div className="container mx-auto p-4 min-h-screen">
      <Card className="w-full max-w-2xl mx-auto mb-8 bg-surface shadow-lg rounded-2xl border-0">
        <CardHeader>
          <CardTitle className="text-primary text-2xl font-bold">Book Search</CardTitle>
          <CardDescription className="text-text-secondary">
            Search for books by title or author using Open Library
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-text-primary">Book Title</Label>
              <Input
                id="title"
                placeholder="Enter book title"
                {...register("title")}
                disabled={loading}
                className="bg-muted border-0 focus:ring-2 focus:ring-primary text-text-primary"
              />
            </div>
            {/* Filters Dropdown */}
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilters((prev) => !prev)}
                className="border-muted text-text-primary"
              >
                {showFilters ? 'Hide Filters' : 'Filters'}
              </Button>
              {showFilters && (
                <div className="absolute z-20 mt-2 w-full sm:w-[36rem] rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-text-primary">Category</Label>
                      <select
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 bg-white"
                      >
                        <option value="">Any</option>
                        <option value="Fiction">Fiction</option>
                        <option value="Non-fiction">Non-fiction</option>
                        <option value="Sci-Fi">Sci-Fi</option>
                        <option value="Fantasy">Fantasy</option>
                        <option value="Mystery">Mystery</option>
                        <option value="Romance">Romance</option>
                        <option value="History">History</option>
                        <option value="Biography">Biography</option>
                        <option value="Self-Help">Self-Help</option>
                        <option value="Business">Business</option>
                        <option value="Tech">Tech</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="condition" className="text-text-primary">Condition</Label>
                      <select
                        id="condition"
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 bg-white"
                      >
                        <option value="">Any</option>
                        <option value="new">New</option>
                        <option value="used">Used</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sort" className="text-text-primary">Sort By</Label>
                      <select
                        id="sort"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 bg-white"
                      >
                        <option value="">Relevance</option>
                        <option value="newest">Newest</option>
                        <option value="author_az">Author A–Z</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-text-primary">Price Range (USD)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="Min"
                          value={priceMin}
                          onChange={(e) => setPriceMin(e.target.value)}
                          className="bg-muted border-0 focus:ring-2 focus:ring-primary text-text-primary"
                        />
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="Max"
                          value={priceMax}
                          onChange={(e) => setPriceMax(e.target.value)}
                          className="bg-muted border-0 focus:ring-2 focus:ring-primary text-text-primary"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-text-primary">Amazon Links</Label>
                      <div className="flex items-center gap-2">
                        <input
                          id="amazonOnly"
                          type="checkbox"
                          checked={amazonOnly}
                          onChange={(e) => setAmazonOnly(e.target.checked)}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="amazonOnly" className="text-text-secondary">Only show results with Amazon links</Label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setCategory('');
                        setCondition('');
                        setSort('');
                        setPriceMin('');
                        setPriceMax('');
                        setAmazonOnly(false);
                      }}
                      className="bg-muted text-text-secondary"
                    >
                      Reset
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowFilters(false)}
                      className="bg-primary text-white"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="author" className="text-text-primary">Author</Label>
              <Input
                id="author"
                placeholder="Enter author name"
                {...register("author")}
                disabled={loading}
                className="bg-muted border-0 focus:ring-2 focus:ring-primary text-text-primary"
              />
            </div>
            <Button
              type="button"
              onClick={onAdvancedSearch}
              className="w-full bg-secondary text-white hover:bg-primary transition-colors duration-200 shadow-md rounded-lg"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Searching...
                </div>
              ) : (
                "Advanced Search"
              )}
            </Button>
            <Button type="submit" className="w-full bg-primary text-white hover:bg-secondary transition-colors duration-200 shadow-md rounded-lg" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Searching...
                </div>
              ) : (
                "Search Books"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <div className="mt-4 p-4 bg-error/10 border border-error/30 rounded-md">
          <p className="text-error text-center">{error}</p>
        </div>
      )}

      {loading && <BookCardSkeletonGrid count={6} />}

      {searchResults.length > 0 && !loading && (
        <div className="mt-12 space-y-6">
          <div className="text-center text-base text-text-secondary font-medium">
            Found {pagination?.totalResults || searchResults.length} results
          </div>
          <div className="flex justify-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl">
              {searchResults.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={favorites.has(book.id)}
                  onAddToCollection={setShowAddToCollection}
                  showAddButton={isLoggedIn}
                  isLoggedIn={isLoggedIn}
                />
              ))}
            </div>
          </div>
          
          {/* Add to Collection Modal */}
          {showAddToCollection && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Add to Collection</h3>
                <form onSubmit={handleCollectionSubmit((data) => handleAddToCollection(searchResults.find(b => b.id === showAddToCollection)!, data))} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="collectionId">Collection</Label>
                    <select
                      {...registerCollection('collectionId')}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                    >
                      <option value="">Select a collection</option>
                      {collections.map((collection) => (
                        <option key={collection._id} value={collection._id}>
                          {collection.name}
                        </option>
                      ))}
                    </select>
                    {collectionErrors.collectionId && (
                      <p className="text-sm text-error">{collectionErrors.collectionId.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="readStatus">Reading Status</Label>
                    <select
                      {...registerCollection('readStatus')}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                    >
                      <option value="to-read">To Read</option>
                      <option value="reading">Currently Reading</option>
                      <option value="completed">Completed</option>
                      <option value="abandoned">Abandoned</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      {...registerCollection('notes')}
                      placeholder="Add your thoughts about this book..."
                      className="focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 bg-surface"
                    />
                    {collectionErrors.notes && (
                      <p className="text-sm text-error">{collectionErrors.notes.message}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={adding} className="flex-1 transition-all duration-300 hover:scale-105 bg-primary text-white rounded-lg">
                      {adding ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          Adding...
                        </div>
                      ) : (
                        'Add to Collection'
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setShowAddToCollection(null);
                        resetCollection();
                      }}
                      className="transition-all duration-300 hover:scale-105 border-muted text-text-secondary rounded-lg"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
          <div className="mt-8 flex flex-col items-center">
            {/* Sentinel for infinite scroll */}
            <div ref={loadMoreRef} />
            {loadingMore && (
              <div className="mt-4 text-text-secondary">Loading more…</div>
            )}
            {pagination && !pagination.hasNextPage && (
              <div className="mt-4 text-text-secondary">End of results</div>
            )}
          </div>
        </div>
      )}

      {!isLoggedIn && searchResults.length === 0 && !loading && (
        <div className="text-center py-20">
          <div className="text-7xl mb-6">📚</div>
          <h3 className="text-2xl font-bold mb-2 text-primary">Start searching for books</h3>
          <p className="text-text-secondary mb-4">
            Use the search form above to find your next favorite book
          </p>
          <div className="text-base text-text-secondary">
            <Link to="/login" className="text-primary hover:underline font-semibold">
              Sign in
            </Link>{' '}
            to save books to your collections
          </div>
        </div>
      )}
    </div>
  );
}