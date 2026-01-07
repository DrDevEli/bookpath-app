import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '../api';

interface CollectionStatsData {
  basic: {
    totalBooks: number;
    completedBooks: number;
    averageRating: number;
    totalPages: number;
  };
  readingStats: {
    toRead: number;
    reading: number;
    completed: number;
    abandoned: number;
    dnf: number;
  };
  favoriteCount: number;
  genreDistribution: Record<string, number>;
  readingProgress: Record<string, number>;
}

interface CollectionStatsProps {
  collectionId: string;
  isVisible: boolean;
  onClose: () => void;
}

export function CollectionStats({ collectionId, isVisible, onClose }: CollectionStatsProps) {
  const [stats, setStats] = useState<CollectionStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/collections/${collectionId}/stats`);
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch statistics';
      setError(typeof errorMsg === 'string' ? errorMsg : String(errorMsg));
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    if (isVisible && collectionId) {
      fetchStats();
    }
  }, [isVisible, collectionId, fetchStats]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Collection Statistics</CardTitle>
              <CardDescription>Detailed insights into your collection</CardDescription>
            </div>
            <Button variant="outline" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
              <p className="text-red-600">{String(error)}</p>
            </div>
          )}

          {stats && (
            <div className="space-y-6">
              {/* Basic Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.basic.totalBooks}</div>
                  <div className="text-sm text-muted-foreground">Total Books</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.basic.completedBooks}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.basic.averageRating > 0 ? stats.basic.averageRating.toFixed(1) : '—'}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Rating</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{stats.favoriteCount}</div>
                  <div className="text-sm text-muted-foreground">Favorites</div>
                </div>
              </div>

              {/* Reading Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Reading Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.readingStats).map(([status, count]) => {
                      const total = stats.basic.totalBooks;
                      const percentage = total > 0 ? (count / total) * 100 : 0;
                      return (
                        <div key={status} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="capitalize">{status.replace('-', ' ')}</span>
                            <span className="text-sm text-muted-foreground">({count})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-12 text-right">
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Genre Distribution */}
              {Object.keys(stats.genreDistribution).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Popular Genres</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats.genreDistribution)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 10)
                        .map(([genre, count]) => (
                          <div key={genre} className="flex items-center justify-between">
                            <span className="text-sm">{genre}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-secondary h-2 rounded-full"
                                  style={{ 
                                    width: `${(count / Math.max(...Object.values(stats.genreDistribution))) * 100}%` 
                                  }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground w-6 text-right">
                                {count}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Reading Progress */}
              {Object.keys(stats.readingProgress).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Reading Progress Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats.readingProgress)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .slice(0, 12)
                        .map(([month, count]) => (
                          <div key={month} className="flex items-center justify-between">
                            <span className="text-sm">{month}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ 
                                    width: `${(count / Math.max(...Object.values(stats.readingProgress))) * 100}%` 
                                  }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground w-6 text-right">
                                {count}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 