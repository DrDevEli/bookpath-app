import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CollectionStats } from '@/components/CollectionStats';
import api from '../api';

interface Collection {
  _id: string;
  name: string;
  description?: string;
  books: Array<{
    bookId: string;
    title: string;
    authors: string[];
    coverImage?: string;
    readStatus: 'to-read' | 'reading' | 'completed' | 'abandoned' | 'dnf';
    rating?: number;
    notes?: string;
    favorite?: boolean;
    addedAt: string;
  }>;
  isPublic: boolean;
  category: 'general' | 'wishlist' | 'favorites' | 'currently-reading' | 'completed' | 'custom';
  color: string;
  tags: string[];
  stats: {
    totalBooks: number;
    completedBooks: number;
    averageRating: number;
    totalPages: number;
  };
  createdAt: string;
  updatedAt: string;
}

const createCollectionSchema = z.object({
  name: z.string().min(1, 'Collection name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  isPublic: z.boolean(),
  category: z.enum(['general', 'wishlist', 'favorites', 'currently-reading', 'completed', 'custom']),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format'),
  tags: z.array(z.string()).optional(),
});

type CreateCollectionForm = z.infer<typeof createCollectionSchema>;

export function Collections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [sharingCollection, setSharingCollection] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
  } = useForm<CreateCollectionForm>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: {
      isPublic: false,
      category: 'general',
      color: '#3B82F6',
      tags: [],
    },
  });

  const watchedColor = watch('color');

  useEffect(() => {
    fetchCollections();
  }, []);

  useEffect(() => {
    let filtered = [...collections];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(collection => collection.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(collection => 
        collection.name.toLowerCase().includes(term) ||
        collection.description?.toLowerCase().includes(term) ||
        collection.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    setFilteredCollections(filtered);
  }, [collections, selectedCategory, searchTerm]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const response = await api.get('/collections');
      if (response.data.success) {
        setCollections(response.data.data);
        setFilteredCollections(response.data.data);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch collections';
      setError(typeof errorMsg === 'string' ? errorMsg : String(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CreateCollectionForm) => {
    try {
      setCreating(true);
      const response = await api.post('/collections', data);
      if (response.data.success) {
        setCollections([...collections, response.data.data]);
        setShowCreateForm(false);
        reset();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to create collection';
      setError(typeof errorMsg === 'string' ? errorMsg : String(errorMsg));
    } finally {
      setCreating(false);
    }
  };

  const getReadStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'reading': return 'bg-blue-100 text-blue-800';
      case 'abandoned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReadStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'reading': return 'Reading';
      case 'abandoned': return 'Abandoned';
      case 'dnf': return 'DNF';
      default: return 'To Read';
    }
  };

  const handleShare = async (collectionId: string) => {
    try {
      setSharingCollection(collectionId);
      const response = await api.post(`/collections/${collectionId}/share`);
      if (response.data.success) {
        const shareableUrl = response.data.data.shareableUrl;
        await navigator.clipboard.writeText(shareableUrl);
        // You could add a toast notification here
        alert('Shareable link copied to clipboard!');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to generate share link';
      setError(typeof errorMsg === 'string' ? errorMsg : String(errorMsg));
    } finally {
      setSharingCollection(null);
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'general': return 'General';
      case 'wishlist': return 'Wishlist';
      case 'favorites': return 'Favorites';
      case 'currently-reading': return 'Currently Reading';
      case 'completed': return 'Completed';
      case 'custom': return 'Custom';
      default: return 'General';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'wishlist': return '📝';
      case 'favorites': return '⭐';
      case 'currently-reading': return '📖';
      case 'completed': return '✅';
      case 'custom': return '🏷️';
      default: return '📚';
    }
  };

  const categories = [
    { value: 'all', label: 'All Collections', icon: '📚' },
    { value: 'general', label: 'General', icon: '📚' },
    { value: 'wishlist', label: 'Wishlist', icon: '📝' },
    { value: 'favorites', label: 'Favorites', icon: '⭐' },
    { value: 'currently-reading', label: 'Currently Reading', icon: '📖' },
    { value: 'completed', label: 'Completed', icon: '✅' },
    { value: 'custom', label: 'Custom', icon: '🏷️' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your collections...</p>
        </div>
      </div>
    );
  }

      return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#dbcd90' }}>
              My Collections
            </h1>
            <p className="text-muted-foreground mt-2">
              Organize your books into personalized collections
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="bg-gradient-to-r from-primary to-teal text-white"
          >
            Create Collection
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search collections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <Button
                key={category.value}
                variant={selectedCategory === category.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.value)}
                className="whitespace-nowrap"
              >
                <span className="mr-1">{category.icon}</span>
                {category.label}
              </Button>
            ))}
          </div>
        </div>

              {/* Create Collection Form */}
        {showCreateForm && (
          <Card className="max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                  style={{ backgroundColor: watchedColor }}
                >
                  📚
                </div>
                <div>
                  <CardTitle>Create New Collection</CardTitle>
                  <CardDescription>
                    Organize your books with a personalized collection
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Collection Name</Label>
                    <Input
                      id="name"
                      placeholder="My Favorite Books"
                      {...register('name')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <select
                      {...register('category')}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="general">📚 General</option>
                      <option value="wishlist">📝 Wishlist</option>
                      <option value="favorites">⭐ Favorites</option>
                      <option value="currently-reading">📖 Currently Reading</option>
                      <option value="completed">✅ Completed</option>
                      <option value="custom">🏷️ Custom</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="A collection of my favorite books..."
                    {...register('description')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="color">Collection Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        {...register('color')}
                        className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                      />
                      <Input
                        {...register('color')}
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <input
                      type="checkbox"
                      id="isPublic"
                      {...register('isPublic')}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="isPublic">Make this collection public</Label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={creating} className="flex-1">
                    {creating ? 'Creating...' : 'Create Collection'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateForm(false);
                      reset();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{String(error)}</p>
        </div>
      )}

              {/* Collections Grid */}
        {filteredCollections.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold mb-2">No collections yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first collection to start organizing your books
            </p>
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-primary to-teal text-white"
            >
              Create Your First Collection
            </Button>
          </CardContent>
        </Card>
              ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCollections.map((collection) => (
                          <Card key={collection._id} className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02]" style={{ borderLeft: `4px solid ${collection.color}` }}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{getCategoryIcon(collection.category)}</span>
                        <CardTitle className="text-lg">{collection.name}</CardTitle>
                      </div>
                      <CardDescription>
                        {collection.description || 'No description'}
                      </CardDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {getCategoryLabel(collection.category)}
                        </span>
                        {collection.tags && collection.tags.length > 0 && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <div className="flex gap-1">
                              {collection.tags.slice(0, 2).map((tag, index) => (
                                <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                  {tag}
                                </span>
                              ))}
                              {collection.tags.length > 2 && (
                                <span className="text-xs text-muted-foreground">+{collection.tags.length - 2}</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {collection.isPublic && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Public
                        </span>
                      )}
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: collection.color }}
                      />
                    </div>
                  </div>
                </CardHeader>
                              <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Books</span>
                        <span className="font-semibold">{collection.stats?.totalBooks || collection.books.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Completed</span>
                        <span className="font-semibold text-green-600">{collection.stats?.completedBooks || 0}</span>
                      </div>
                      {collection.stats?.averageRating > 0 && (
                        <div className="flex items-center justify-between col-span-2">
                          <span className="text-muted-foreground">Avg Rating</span>
                          <span className="font-semibold text-yellow-600">
                            {'⭐'.repeat(Math.round(collection.stats.averageRating))} {collection.stats.averageRating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  {collection.books.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Recent books:</p>
                      <div className="space-y-1">
                        {collection.books.slice(0, 3).map((book, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            {book.coverImage && (
                              <img 
                                src={book.coverImage} 
                                alt={book.title}
                                className="w-8 h-10 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium">{book.title}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {book.authors.join(', ')}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${getReadStatusColor(book.readStatus)}`}>
                              {getReadStatusText(book.readStatus)}
                            </span>
                          </div>
                        ))}
                        {collection.books.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{collection.books.length - 3} more books
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                              </CardContent>
                <CardFooter className="flex gap-2">
                  <Button variant="outline" className="flex-1" asChild>
                    <Link to={`/collections/${collection._id}`}>
                      View Collection
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedCollectionId(collection._id);
                      setShowStats(true);
                    }}
                    className="px-3"
                    title="View Statistics"
                  >
                    📊
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleShare(collection._id)}
                    disabled={sharingCollection === collection._id}
                    className="px-3"
                    title="Share Collection"
                  >
                    {sharingCollection === collection._id ? '⏳' : '🔗'}
                  </Button>
                </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Collection Statistics Modal */}
      <CollectionStats
        collectionId={selectedCollectionId || ''}
        isVisible={showStats}
        onClose={() => {
          setShowStats(false);
          setSelectedCollectionId(null);
        }}
      />
    </div>
  );
} 