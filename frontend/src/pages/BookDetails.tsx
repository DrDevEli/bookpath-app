import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../api';
import { isAuthenticated } from '../auth';

interface Book {
  id: string;
  title: string;
  authors: string[];
  description?: string;
  coverImage?: string;
  firstPublishYear?: number;
  editionCount?: number;
  ratingsAverage?: number;
  ratingsCount?: number;
  openLibraryKey: string;
  subjects?: string[];
  languages?: string[];
  publishers?: string[];
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

export function BookDetails() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [adding, setAdding] = useState(false);
  const isLoggedIn = isAuthenticated();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddToCollectionForm>({
    resolver: zodResolver(addToCollectionSchema),
  });

  const fetchBookDetails = useCallback(async () => {
    try {
      setLoading(true);
      // GET /books/:id — get book details
      const response = await api.get(`/books/${id}`);
      if (response.data.success) {
        setBook(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch book details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchCollections = useCallback(async () => {
    try {
      // GET /collections — list user's collections
      const response = await api.get('/collections');
      if (response.data.success) {
        setCollections(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch collections:', err);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchBookDetails();
      if (isLoggedIn) {
        fetchCollections();
      }
    }
  }, [id, isLoggedIn, fetchBookDetails, fetchCollections]);

  const handleAddToCollection = async (data: AddToCollectionForm) => {
    if (!book) return;

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
        setShowAddToCollection(false);
        reset();
        setError(null);
        // Show success message or redirect
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add book to collection');
    } finally {
      setAdding(false);
    }
  };

  const getRatingStars = (rating?: number) => {
    if (!rating) return 'No rating';
    return '⭐'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading book details...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Book not found</h2>
        <p className="text-muted-foreground mb-4">
          The book you're looking for doesn't exist.
        </p>
        <Button asChild>
          <Link to="/search">Back to Search</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" asChild>
          <Link to="/search">← Back to Search</Link>
        </Button>
        {isLoggedIn && (
          <Button 
            onClick={() => setShowAddToCollection(true)}
            className="bg-gradient-to-r from-primary to-teal text-white"
          >
            Add to Collection
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Book Details */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Book Cover and Basic Info */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              {book.coverImage ? (
                <img
                  src={book.coverImage}
                  alt={book.title}
                  className="w-full rounded-lg shadow-lg mb-6"
                />
              ) : (
                <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center mb-6">
                  <span className="text-gray-500 text-lg">No cover available</span>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-bold mb-2" style={{ color: '#dbcd90' }}>
                    {book.title}
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    by {book.authors.join(', ')}
                  </p>
                </div>

                {book.ratingsAverage && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rating:</span>
                    <span className="text-yellow-600">{getRatingStars(book.ratingsAverage)}</span>
                    <span className="text-sm text-muted-foreground">
                      ({book.ratingsCount} ratings)
                    </span>
                  </div>
                )}

                {book.firstPublishYear && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Published:</span>
                    <span>{book.firstPublishYear}</span>
                  </div>
                )}

                {book.editionCount && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Editions:</span>
                    <span>{book.editionCount}</span>
                  </div>
                )}

                {!isLoggedIn && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <Link to="/login" className="underline">Sign in</Link> to add this book to your collections
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Book Details and Description */}
        <div className="lg:col-span-2 space-y-6">
          {book.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {book.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Additional Details */}
          <div className="grid gap-6 md:grid-cols-2">
            {book.subjects && book.subjects.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Subjects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {book.subjects.slice(0, 10).map((subject, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {subject}
                      </span>
                    ))}
                    {book.subjects.length > 10 && (
                      <span className="text-sm text-muted-foreground">
                        +{book.subjects.length - 10} more
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {book.languages && book.languages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Languages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {book.languages.map((language, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {language}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {book.publishers && book.publishers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Publishers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {book.publishers.map((publisher, index) => (
                      <p key={index} className="text-sm text-muted-foreground">
                        {publisher}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {book.openLibraryKey && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">External Links</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <a
                      href={`https://openlibrary.org${book.openLibraryKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm flex items-center gap-2"
                    >
                      <span>View on Open Library</span>
                      <span>↗</span>
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Add to Collection Modal */}
      {showAddToCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add to Collection</CardTitle>
              <CardDescription>
                Add "{book.title}" to one of your collections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(handleAddToCollection)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="collectionId">Collection</Label>
                  <select
                    {...register('collectionId')}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="">Select a collection</option>
                    {collections.map((collection) => (
                      <option key={collection._id} value={collection._id}>
                        {collection.name}
                      </option>
                    ))}
                  </select>
                  {errors.collectionId && (
                    <p className="text-sm text-red-500">{errors.collectionId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="readStatus">Reading Status</Label>
                  <select
                    {...register('readStatus')}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
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
                    {...register('notes')}
                    placeholder="Add your thoughts about this book..."
                  />
                  {errors.notes && (
                    <p className="text-sm text-red-500">{errors.notes.message}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={adding} className="flex-1">
                    {adding ? 'Adding...' : 'Add to Collection'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowAddToCollection(false);
                      reset();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 