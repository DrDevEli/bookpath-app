import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import BookCard from '@/components/BookCard';
import api from '../api';

interface LibraryBook {
  _id?: string;
  bookId: string;
  title: string;
  authors: string[];
  coverImage?: string;
  readStatus: 'to-read' | 'reading' | 'completed' | 'abandoned' | 'dnf';
  rating?: number;
  notes?: string;
  favorite?: boolean;
  progress?: number;
  addedAt?: string;
  dateStarted?: string;
  dateFinished?: string;
  openLibraryKey?: string;
  firstPublishYear?: number;
  editionCount?: number;
  ratingsAverage?: number;
  category?: string;
  description?: string;
  price?: number;
  currencyCode?: string;
  condition?: 'new' | 'used' | 'unknown';
  pages?: number;
}

interface LibraryStats {
  totalBooks: number;
  completedBooks: number;
  totalPages: number;
  averageRating: number;
}

interface CollectionSummary {
  _id: string;
  name: string;
  description?: string;
  category: string;
  color: string;
  isPublic: boolean;
  bookCount: number;
  completedCount: number;
}

interface LibraryResponse {
  success: boolean;
  data: {
    books: LibraryBook[];
    stats?: LibraryStats;
    collections?: CollectionSummary[];
  };
}

interface Shelf {
  key: string;
  label: string;
  icon: string;
  filter: (book: LibraryBook) => boolean;
}

const shelves: Shelf[] = [
  {
    key: 'want-to-read',
    label: 'Want to Read',
    icon: '📝',
    filter: (book) => book.readStatus === 'to-read',
  },
  {
    key: 'reading',
    label: 'Reading',
    icon: '📖',
    filter: (book) => book.readStatus === 'reading',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: '✅',
    filter: (book) => book.readStatus === 'completed',
  },
  {
    key: 'favorites',
    label: 'Favorites',
    icon: '⭐',
    filter: (book) => book.favorite === true,
  },
];

export function Library() {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeShelf, setActiveShelf] = useState<string>('want-to-read');
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLibrary();
  }, []);

  const fetchLibrary = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<LibraryResponse>('/library');
      if (response.data.success) {
        setBooks(response.data.data.books || []);
        setCollections(response.data.data.collections || []);
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch library';
      setError(typeof errorMsg === 'string' ? errorMsg : String(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  const computeStats = (): LibraryStats => {
    const totalBooks = books.length;
    const completedBooks = books.filter(
      (b) => b.readStatus === 'completed'
    ).length;
    const totalPages = books.reduce((sum, b) => sum + (b.pages || 0), 0);
    const ratedBooks = books.filter((b) => typeof b.rating === 'number' && b.rating > 0);
    const averageRating =
      ratedBooks.length > 0
        ? ratedBooks.reduce((sum, b) => sum + (b.rating || 0), 0) /
          ratedBooks.length
        : 0;
    return { totalBooks, completedBooks, totalPages, averageRating };
  };

  const activeShelfBooks = books.filter((book) => {
    const shelf = shelves.find((s) => s.key === activeShelf);
    return shelf ? shelf.filter(book) : true;
  });

  const handleEdit = (bookId: string) => {
    const book = books.find(
      (b) => (b._id || b.bookId) === bookId
    );
    if (book) {
      setEditingBook(book);
    }
  };

  const handleEditFormChange = (
    field: keyof Pick<LibraryBook, 'readStatus' | 'rating' | 'notes' | 'progress'>,
    value: any
  ) => {
    if (!editingBook) return;
    setEditingBook({ ...editingBook, [field]: value });
  };

  const handleSaveEdit = async () => {
    if (!editingBook) return;
    const bookId = editingBook._id || editingBook.bookId;

    try {
      setUpdating(true);
      const payload: Record<string, any> = {
        readStatus: editingBook.readStatus,
      };
      if (editingBook.rating !== undefined) payload.rating = editingBook.rating;
      if (editingBook.notes !== undefined) payload.notes = editingBook.notes;
      if (editingBook.progress !== undefined) payload.progress = editingBook.progress;

      const response = await api.put(`/library/${bookId}`, payload);
      if (response.data.success) {
        setBooks((prev) =>
          prev.map((b) =>
            (b._id || b.bookId) === bookId
              ? { ...b, ...payload }
              : b
          )
        );
        setEditingBook(null);
        toast({
          variant: 'success',
          title: 'Book Updated',
          description: 'Book information has been updated successfully.',
        });
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to update book';
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: errorMsg,
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleRemove = async (bookId: string) => {
    const book = books.find((b) => (b._id || b.bookId) === bookId);
    const title = book?.title || 'this book';
    const confirmed = window.confirm(
      `Are you sure you want to remove "${title}" from your library?`
    );
    if (!confirmed) return;

    try {
      const response = await api.delete(`/library/${bookId}`);
      if (response.data.success) {
        setBooks((prev) =>
          prev.filter((b) => (b._id || b.bookId) !== bookId)
        );
        if (editingBook && (editingBook._id || editingBook.bookId) === bookId) {
          setEditingBook(null);
        }
        toast({
          variant: 'success',
          title: 'Book Removed',
          description: `"${title}" has been removed from your library.`,
        });
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to remove book';
      toast({
        variant: 'destructive',
        title: 'Remove Failed',
        description: errorMsg,
      });
    } 
  };

  // --- Loading state ---
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your library...</p>
          </div>
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="space-y-8">
        <div
          className="p-8 rounded-lg text-center"
          style={{
            background:
              'linear-gradient(135deg, rgba(74, 0, 127, 0.1) 0%, rgba(0, 230, 230, 0.1) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#dbcd90' }}>
            Something went wrong
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchLibrary} className="bg-gradient-to-r from-primary to-teal text-white">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const stats = computeStats();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: '#dbcd90' }}
          >
            My Library
          </h1>
          <p className="text-muted-foreground mt-2">
            Track your reading journey across your personal shelves
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          style={{
            background:
              'linear-gradient(135deg, rgba(74, 0, 127, 0.15) 0%, rgba(0, 230, 230, 0.1) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow:
              '0 8px 32px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span>📚</span> Total Books
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" style={{ color: '#dbcd90' }}>
              {stats.totalBooks}
            </p>
          </CardContent>
        </Card>

        <Card
          style={{
            background:
              'linear-gradient(135deg, rgba(74, 0, 127, 0.15) 0%, rgba(0, 230, 230, 0.1) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow:
              '0 8px 32px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span>✅</span> Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-400">
              {stats.completedBooks}
            </p>
          </CardContent>
        </Card>

        <Card
          style={{
            background:
              'linear-gradient(135deg, rgba(74, 0, 127, 0.15) 0%, rgba(0, 230, 230, 0.1) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow:
              '0 8px 32px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span>📄</span> Total Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-400">
              {stats.totalPages.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card
          style={{
            background:
              'linear-gradient(135deg, rgba(74, 0, 127, 0.15) 0%, rgba(0, 230, 230, 0.1) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow:
              '0 8px 32px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span>⭐</span> Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-400">
              {stats.averageRating > 0
                ? stats.averageRating.toFixed(1)
                : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Collections Summary */}
      {collections.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold" style={{ color: '#dbcd90' }}>
              My Collections
            </h2>
            <Link
              to="/collections"
              className="text-sm text-primary hover:underline"
            >
              Manage →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((c) => (
              <Link key={c._id} to={`/collections/${c._id}`}>
                <Card
                  className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                  style={{ borderLeft: `4px solid ${c.color}` }}
                >
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      {c.name}
                      {c.isPublic && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                          Public
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>📚 {c.bookCount} books</span>
                      <span>✅ {c.completedCount} completed</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Shelf Tabs */}
      <div className="flex gap-2 flex-wrap">
        {shelves.map((shelf) => (
          <Button
            key={shelf.key}
            variant={activeShelf === shelf.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveShelf(shelf.key)}
            className={`whitespace-nowrap transition-all duration-300 ${
              activeShelf === shelf.key
                ? 'bg-gradient-to-r from-primary to-teal text-white'
                : ''
            }`}
          >
            <span className="mr-1">{shelf.icon}</span>
            {shelf.label}
          </Button>
        ))}
      </div>

      {/* Books Grid / Empty State */}
      {activeShelfBooks.length === 0 ? (
        <Card
          className="text-center py-12"
          style={{
            background:
              'linear-gradient(135deg, rgba(74, 0, 127, 0.1) 0%, rgba(0, 230, 230, 0.1) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow:
              '0 8px 32px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <CardContent>
            <div className="text-6xl mb-4">
              {shelves.find((s) => s.key === activeShelf)?.icon || '📚'}
            </div>
            <h3
              className="text-xl font-semibold mb-2"
              style={{ color: '#dbcd90' }}
            >
              No books here yet
            </h3>
            <p className="text-muted-foreground mb-4">
              {activeShelf === 'want-to-read' &&
                'Add books to your reading list to see them here.'}
              {activeShelf === 'reading' &&
                'Start reading books to see them on this shelf.'}
              {activeShelf === 'completed' &&
                'Finish reading books to see them on your completed shelf.'}
              {activeShelf === 'favorites' &&
                'Mark books as favorites to see them on this shelf.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {activeShelfBooks.map((book) => (
            <BookCard
              key={book._id || book.bookId}
              book={{
                ...book,
                id: book._id || book.bookId,
              }}
              showReadStatus={true}
              showProgress={true}
              onEdit={(bookId) => handleEdit(bookId)}
              onRemove={(bookId) => handleRemove(bookId)}
            />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingBook && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            className="rounded-lg p-6 max-w-md w-full mx-4"
            style={{
              background:
                'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow:
                '0 25px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            }}
          >
            <h3
              className="text-lg font-semibold mb-4"
              style={{ color: '#dbcd90' }}
            >
              Edit Book
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="editStatus" style={{ color: 'rgb(203, 213, 225)' }}>
                    Status
                  </Label>
                  <select
                    id="editStatus"
                    value={editingBook.readStatus}
                    onChange={(e) =>
                      handleEditFormChange('readStatus', e.target.value)
                    }
                    className="w-full rounded-md border border-gray-600 bg-gray-800 text-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                  >
                    <option value="to-read">To Read</option>
                    <option value="reading">Reading</option>
                    <option value="completed">Completed</option>
                    <option value="abandoned">Abandoned</option>
                    <option value="dnf">DNF</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="editRating" style={{ color: 'rgb(203, 213, 225)' }}>
                    Rating
                  </Label>
                  <select
                    id="editRating"
                    value={editingBook.rating ?? ''}
                    onChange={(e) =>
                      handleEditFormChange(
                        'rating',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="w-full rounded-md border border-gray-600 bg-gray-800 text-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                  >
                    <option value="">No rating</option>
                    <option value="1">1 ⭐</option>
                    <option value="2">2 ⭐</option>
                    <option value="3">3 ⭐</option>
                    <option value="4">4 ⭐</option>
                    <option value="5">5 ⭐</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="editProgress" style={{ color: 'rgb(203, 213, 225)' }}>
                  Progress (%)
                </Label>
                <Input
                  id="editProgress"
                  type="number"
                  min={0}
                  max={100}
                  value={editingBook.progress ?? ''}
                  onChange={(e) =>
                    handleEditFormChange(
                      'progress',
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  placeholder="0"
                  className="bg-gray-800 border-gray-600 text-gray-200 focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <Label htmlFor="editNotes" style={{ color: 'rgb(203, 213, 225)' }}>
                  Notes
                </Label>
                <Input
                  id="editNotes"
                  value={editingBook.notes ?? ''}
                  onChange={(e) =>
                    handleEditFormChange('notes', e.target.value)
                  }
                  placeholder="Add your thoughts..."
                  className="bg-gray-800 border-gray-600 text-gray-200 focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={updating}
                  className="flex-1 bg-gradient-to-r from-primary to-teal text-white transition-all duration-300 hover:scale-105"
                >
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
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingBook(null)}
                  className="transition-all duration-300 hover:scale-105"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Library;
