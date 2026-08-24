import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import BookCard from '@/components/BookCard';
import api from '../api';

interface SharedBook {
  bookId: string;
  title: string;
  authors: string[];
  coverImage?: string;
  readStatus?: 'to-read' | 'reading' | 'completed' | 'abandoned' | 'dnf';
  rating?: number;
}

interface SharedCollectionData {
  _id: string;
  name: string;
  description?: string;
  books: SharedBook[];
  isPublic: boolean;
  createdAt: string;
  user?: { username?: string; email?: string };
}

export function SharedCollection() {
  const { shareableLink } = useParams<{ shareableLink: string }>();
  const [collection, setCollection] = useState<SharedCollectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShared = useCallback(async () => {
    if (!shareableLink) return;
    try {
      setLoading(true);
      const response = await api.get(`/collections/shared/${shareableLink}`);
      if (response.data.success) {
        setCollection(response.data.data);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || 'Failed to load collection';
      setError(typeof msg === 'string' ? msg : String(msg));
    } finally {
      setLoading(false);
    }
  }, [shareableLink]);

  useEffect(() => {
    fetchShared();
  }, [fetchShared]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared collection...</p>
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🔗</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#dbcd90' }}>
          Collection not available
        </h2>
        <p className="text-muted-foreground mb-4">
          {error || 'This shared collection does not exist or is no longer public.'}
        </p>
        <Button asChild className="bg-gradient-to-r from-primary to-teal text-white">
          <Link to="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="text-5xl mb-3">📚</div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#dbcd90' }}>
          {collection.name}
        </h1>
        {collection.description && (
          <p className="text-muted-foreground mt-2">{collection.description}</p>
        )}
        <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
          <span>{collection.books.length} books</span>
          {collection.user?.username && (
            <>
              <span>•</span>
              <span>by {collection.user.username}</span>
            </>
          )}
        </div>
      </div>

      {collection.books.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold mb-2">No books in this collection yet</h3>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {collection.books.map((book) => (
            <BookCard
              key={book.bookId}
              book={{ ...book, authors: book.authors || [], id: book.bookId }}
              showReadStatus={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SharedCollection;
