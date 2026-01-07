import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import BookCard from '@/components/BookCard';
import api from '../api';

interface Book {
  bookId: string;
  title: string;
  authors: string[];
  coverImage?: string;
  readStatus: 'to-read' | 'reading' | 'completed' | 'abandoned';
  rating?: number;
  notes?: string;
  addedAt: string;
  progress?: number;
  dateStarted?: string;
  dateFinished?: string;
}

interface Collection {
  _id: string;
  name: string;
  description?: string;
  books: Book[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

const updateBookSchema = z.object({
  notes: z.string().max(500, 'Notes too long').optional(),
  rating: z.number().min(1).max(5).optional(),
  readStatus: z.enum(['to-read', 'reading', 'completed', 'abandoned']),
  progress: z.number().min(0).max(100).optional(),
});

type UpdateBookForm = z.infer<typeof updateBookSchema>;

export function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingBook, setEditingBook] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
  } = useForm<UpdateBookForm>({
    resolver: zodResolver(updateBookSchema),
  });

  const fetchCollection = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/collections/${id}`);
      if (response.data.success) {
        setCollection(response.data.data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch collection';
      setError(typeof errorMessage === 'string' ? errorMessage : String(errorMessage));
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  const handleUpdateBook = async (bookId: string, data: UpdateBookForm) => {
    try {
      setUpdating(true);
      const response = await api.put(`/collections/${id}/books/${bookId}`, data);
      if (response.data.success) {
        setCollection(response.data.data);
        setEditingBook(null);
        reset();
        toast({
          variant: "success",
          title: "Book Updated",
          description: "Book information has been updated successfully.",
        });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update book';
      setError(typeof errorMessage === 'string' ? errorMessage : String(errorMessage));
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: errorMessage,
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveBook = async (bookId: string) => {
    const userConfirmed = window.confirm('Are you sure you want to remove this book from the collection?');
    if (!userConfirmed) {
      return;
    }

    try {
      const response = await api.delete(`/collections/${id}/books/${bookId}`);
      if (response.data.success) {
        setCollection(response.data.data);
        toast({
          variant: "success",
          title: "Book Removed",
          description: "Book has been removed from the collection.",
        });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to remove book';
      setError(typeof errorMessage === 'string' ? errorMessage : String(errorMessage));
      toast({
        variant: "destructive",
        title: "Remove Failed",
        description: errorMessage,
      });
    }
  };

  // Helper functions moved to BookCard component

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading collection...</p>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Collection not found</h2>
        <p className="text-muted-foreground mb-4">
          The collection you're looking for doesn't exist or you don't have access to it.
        </p>
        <Button asChild>
          <Link to="/collections">Back to Collections</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Button variant="outline" asChild>
              <Link to="/collections">← Back to Collections</Link>
            </Button>
            {collection.isPublic && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Public Collection
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#dbcd90' }}>
            {collection.name}
          </h1>
          {collection.description && (
            <p className="text-muted-foreground mt-2">{collection.description}</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span>{collection.books.length} books</span>
            <span>•</span>
            <span>Created {new Date(collection.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <Button 
          asChild
          className="bg-gradient-to-r from-primary to-teal text-white transition-all duration-300 hover:scale-105"
        >
          <Link to="/search">Add Books</Link>
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{String(error)}</p>
        </div>
      )}

      {/* Books List */}
      {collection.books.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold mb-2">No books yet</h3>
            <p className="text-muted-foreground mb-4">
              Start adding books to your collection
            </p>
            <Button asChild className="bg-gradient-to-r from-primary to-teal text-white transition-all duration-300 hover:scale-105">
              <Link to="/search">Search for Books</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {collection.books.map((book) => (
            <BookCard
              key={book.bookId}
              book={{
                ...book,
                id: book.bookId,
              }}
              showReadStatus={true}
              showProgress={true}
              onEdit={(bookId) => {
                setEditingBook(bookId);
                setValue('readStatus', book.readStatus);
                setValue('rating', book.rating);
                setValue('notes', book.notes);
              }}
              onRemove={handleRemoveBook}
            />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Book</h3>
            <form 
              onSubmit={handleSubmit((data) => handleUpdateBook(editingBook, data))}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="readStatus">Status</Label>
                  <select
                    {...register('readStatus')}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                  >
                    <option value="to-read">To Read</option>
                    <option value="reading">Reading</option>
                    <option value="completed">Completed</option>
                    <option value="abandoned">Abandoned</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="rating">Rating</Label>
                  <select
                    {...register('rating', { valueAsNumber: true })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                  >
                    <option value="">No rating</option>
                    <option value="1">1 star</option>
                    <option value="2">2 stars</option>
                    <option value="3">3 stars</option>
                    <option value="4">4 stars</option>
                    <option value="5">5 stars</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  {...register('notes')}
                  placeholder="Add your thoughts..."
                  className="focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={updating} className="flex-1 transition-all duration-300 hover:scale-105">
                  {updating ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Saving...
                    </div>
                  ) : (
                    'Save'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setEditingBook(null);
                    reset();
                  }}
                  className="transition-all duration-300 hover:scale-105"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 