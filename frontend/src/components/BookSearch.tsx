import React, { useState, useEffect } from 'react';
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
  // Store last search query for pagination
  const [lastSearchTitle, setLastSearchTitle] = useState<string>('');
  const [lastSearchAuthor, setLastSearchAuthor] = useState<string>('');
  const isLoggedIn = isAuthenticated();
  const { toast } = useToast();

  const { register, handleSubmit } = useForm<BookSearchForm>();
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
    
    // Store search query for pagination
    setLastSearchTitle(data.title || '');
    setLastSearchAuthor(data.author || '');
    
    try {
      const params = new URLSearchParams();
      if (data.title) params.append('title', data.title);
      if (data.author) params.append('author', data.author);
      if (category) params.append('category', category);
      if (condition) params.append('condition', condition);
      if (sort) params.append('sort', sort);

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
      const errorString = typeof errorMessage === 'string' ? errorMessage : String(errorMessage);
      setError(errorString);
      toast({
        variant: "destructive",
        title: "Search Error",
        description: errorString,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (page: number) => {
    if (!pagination) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // Include original search parameters (required by backend)
      if (lastSearchTitle) params.append('title', lastSearchTitle);
      if (lastSearchAuthor) params.append('author', lastSearchAuthor);
      if (category) params.append('category', category);
      if (condition) params.append('condition', condition);
      if (sort) params.append('sort', sort);
      params.append('page', page.toString());
      
      const response = await api.get(`/books/search?${params.toString()}`);
      
      if (response.data.success) {
        setSearchResults(response.data.data || []);
        setPagination(response.data.pagination || null);
      }
    } catch (err: any) {
      console.error("Page change error:", err);
      setError("Failed to load page. Please try again.");
      toast({
        variant: "destructive",
        title: "Page Load Error",
        description: "Failed to load the requested page.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCollection = async (book: Book, data: AddToCollectionForm) => {
    try {
      setAdding(true);
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
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
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
              <div>
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
              <div>
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
          <p className="text-error text-center">{String(error)}</p>
        </div>
      )}

      {loading && <BookCardSkeletonGrid count={6} />}

      {searchResults.length > 0 && !loading && (
        <div className="mt-12 space-y-6">
          <div className="text-center text-base text-text-secondary font-medium">
            {pagination ? (
              <>Found {pagination.totalResults} result{pagination.totalResults !== 1 ? 's' : ''}</>
            ) : (
              <>Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</>
            )}
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
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-4 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPreviousPage || loading}
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                className="transition-all duration-300 hover:scale-105 border-primary text-primary font-semibold"
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-base text-text-secondary">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNextPage || loading}
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                className="transition-all duration-300 hover:scale-105 border-primary text-primary font-semibold"
              >
                Next
              </Button>
            </div>
          )}
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