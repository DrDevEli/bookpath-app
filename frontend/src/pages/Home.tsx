import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import FeaturedBooks from '../components/FeaturedBooks';
import TrendingBooks from '../components/TrendingBooks';
import { recommendationsAPI } from '../api';
import { isAuthenticated } from '../auth';

const suggestedBooks = [
  {
    id: 4,
    title: "The Alchemist",
    author: "Paulo Coelho",
    description: "A magical story about following your dreams and listening to your heart.",
    cover: "https://covers.openlibrary.org/b/id/12749894-L.jpg",
    rating: 4.5,
    genre: "Fiction",
  },
  {
    id: 5,
    title: "Sapiens",
    author: "Yuval Noah Harari",
    description: "A brief history of humankind, from ancient humans to the present day.",
    cover: "https://covers.openlibrary.org/b/id/12749895-L.jpg",
    rating: 4.8,
    genre: "Non-Fiction",
  },
  {
    id: 6,
    title: "The Midnight Library",
    author: "Matt Haig",
    description: "Between life and death there is a library, and within that library, the shelves go on forever.",
    cover: "https://covers.openlibrary.org/b/id/12749896-L.jpg",
    rating: 4.3,
    genre: "Fiction",
  },
  {
    id: 7,
    title: "Atomic Habits",
    author: "James Clear",
    description: "Tiny changes, remarkable results: An easy & proven way to build good habits & break bad ones.",
    cover: "https://covers.openlibrary.org/b/id/12749897-L.jpg",
    rating: 4.7,
    genre: "Self-Help",
  }
];

export function Home() {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState(0);

  // AI Recommendations state
  interface Recommendation {
    id: string;
    title: string;
    author: string;
    matchScore: number;
    reason: string;
    similarTo: string;
    coverImage?: string;
  }
  const [aiRecommendations, setAiRecommendations] = useState<Recommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState<string | null>(null);
  const [recsEmpty, setRecsEmpty] = useState(false);
  const [recsRefreshing, setRecsRefreshing] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    if (!isAuthenticated()) return;
    setRecsLoading(true);
    setRecsError(null);
    setRecsEmpty(false);
    try {
      const res = await recommendationsAPI.getRecommendations();
      const data = res.data;
      const recs = Array.isArray(data?.recommendations) ? data.recommendations : Array.isArray(data) ? data : [];
      if (recs.length === 0) {
        setRecsEmpty(true);
      }
      setAiRecommendations(recs.slice(0, 5));
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.data?.message?.includes('more books')) {
        setRecsEmpty(true);
      } else {
        setRecsError(err.response?.data?.message || err.message || 'Failed to load recommendations');
      }
    } finally {
      setRecsLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRecsRefreshing(true);
    setRecsError(null);
    try {
      await recommendationsAPI.refreshRecommendations();
      await fetchRecommendations();
    } catch (err: any) {
      setRecsError(err.response?.data?.message || err.message || 'Failed to refresh recommendations');
    } finally {
      setRecsRefreshing(false);
    }
  };

  useEffect(() => {
    // Trigger suggestions animation after page loads
    const timer = setTimeout(() => {
      setShowSuggestions(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isAuthenticated()) {
      fetchRecommendations();
    }
  }, [fetchRecommendations]);

  useEffect(() => {
    if (showSuggestions) {
      // Rotate through suggestions every 4 seconds
      const interval = setInterval(() => {
        setCurrentSuggestion((prev) => (prev + 1) % suggestedBooks.length);
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [showSuggestions]);

  const getRatingStars = (rating: number) => {
    return '⭐'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  };

  return (
    <div className="relative min-h-screen">
      {/* Top Section with Hero and Suggestions */}
      <div className="flex flex-col lg:flex-row gap-16 items-center justify-center w-full mt-4">
        {/* Hero Section - Top Left Corner */}
        <section
          className="relative text-left space-y-1 py-4 px-4 rounded-xl shadow-lg overflow-hidden max-w-sm z-10"
          style={{
            background: 'linear-gradient(135deg, rgba(74, 0, 127, 0.08) 0%, rgba(0, 230, 230, 0.08) 100%)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="relative z-10 flex flex-col items-start justify-start text-left">
            <div className="flex flex-row items-center gap-6 mb-2 mx-2 md:mx-4">
              <img
                src="/bookpath_icon_concept3_updated.png"
                alt="BookPath Icon Hero"
                className="h-14 w-auto drop-shadow-lg"
                style={{ filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6))' }}
              />
              <h1 className="text-lg md:text-xl font-heading font-bold tracking-tighter text-white drop-shadow-lg" style={{ fontFamily: 'Montserrat, sans-serif', textShadow: '0 2px 6px rgba(0, 0, 0, 0.7)' }}>
                Discover Books with AI-Powered Insight
              </h1>
            </div>
            <p className="text-xs md:text-sm text-white mb-2 drop-shadow-md" style={{ fontFamily: 'Open Sans, sans-serif', textShadow: '0 1px 4px rgba(0, 0, 0, 0.6)' }}>
              BookPath helps you explore, collect, and understand books—powered by artificial intelligence and a passion for discovery.
            </p>
            <div className="flex flex-col gap-1 w-full">
              <Button asChild size="sm" className="bg-teal-500/40 hover:bg-teal-400/50 text-white shadow-lg px-4 py-1 text-xs font-bold rounded-full transition-all duration-300 backdrop-blur-sm border border-teal-400/15">
                <Link to="/search">Start Discovering</Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="bg-white/3 text-white border-white/20 px-4 py-1 text-xs font-bold rounded-full transition-all duration-300 hover:bg-white/10 backdrop-blur-sm">
                <Link to="/register">Join Now</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Dynamic Suggestions Card */}
        <div
          className={`transition-all duration-[1800ms] ease-out ${
            showSuggestions ? 'opacity-100 translate-x-0 scale-100 rotate-0' : 'opacity-0 translate-x-24 scale-95 -rotate-2'
          }`}
          style={{
            transform: showSuggestions ? 'translateX(0) scale(1) rotate(0deg)' : 'translateX(6rem) scale(0.95) rotate(-2deg)',
          }}
        >
          <Card className="max-w-sm rounded-xl shadow-2xl overflow-hidden border-0 transform transition-all duration-500 hover:scale-105 hover:shadow-3xl py-4 px-4" style={{
            background: 'linear-gradient(135deg, rgba(74, 0, 127, 0.1) 0%, rgba(0, 230, 230, 0.1) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
                <CardTitle className="text-base text-white animate-fade-in" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}>
                  AI Suggestions
                </CardTitle>
              </div>
              <CardDescription className="text-white/80 animate-fade-in-delayed text-xs">
                Personalized recommendations just for you
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pb-2">
              {suggestedBooks.map((book, index) => (
                <div
                  key={book.id}
                  className={`transition-all duration-700 ease-in-out ${
                    index === currentSuggestion ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 absolute inset-0'
                  }`}
                >
                  <div className="flex gap-2">
                    <div className="flex-shrink-0">
                      <img
                        src={book.cover}
                        alt={book.title}
                        className="w-12 h-16 object-cover rounded-lg shadow-lg transition-transform duration-300 hover:scale-110"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-0.5 truncate text-sm transition-all duration-300 hover:text-teal-300" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                        {book.title}
                      </h3>
                      <p className="text-xs text-white/80 mb-1 transition-colors duration-300 hover:text-white/90">
                        by {book.author}
                      </p>
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-xs animate-pulse" style={{ color: 'rgb(250, 204, 21)' }}>
                          {getRatingStars(book.rating)}
                        </span>
                        <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          {book.rating}
                        </span>
                      </div>
                      <span className="inline-block px-1.5 py-0.5 text-[10px] rounded-full transition-all duration-300 hover:scale-105" style={{ backgroundColor: 'rgba(94, 234, 212, 0.2)', color: 'rgb(94, 234, 212)', border: '1px solid rgba(94, 234, 212, 0.3)' }}>
                        {book.genre}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-white/70 mt-1 line-clamp-2 transition-all duration-300 hover:text-white/80">
                    {book.description}
                  </p>
                </div>
              ))}
            </CardContent>
            
            <CardFooter className="pt-0">
              <div className="flex items-center justify-between w-full">
                <div className="flex gap-1">
                  {suggestedBooks.map((_, index) => (
                    <div
                      key={index}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                        index === currentSuggestion ? 'bg-teal-400 scale-110' : 'bg-white/30 scale-100'
                      }`}
                    />
                  ))}
                </div>
                <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105 px-2 py-0.5 text-xs">
                  View All
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
      {/* Featured Books Section */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight mb-6 text-center" style={{ color: 'rgb(30, 41, 59)', fontFamily: 'Montserrat, sans-serif' }}>
          Featured Books
        </h2>
        <FeaturedBooks />
      </section>

      {/* Trending Now — top-converting section (renders only when click data exists) */}
      <section className="mt-12 max-w-7xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-center" style={{ color: 'rgb(30, 41, 59)', fontFamily: 'Montserrat, sans-serif' }}>
            Trending Now
          </h2>
          <span className="inline-block px-2 py-0.5 text-xs font-bold rounded-full" style={{ backgroundColor: 'rgba(219, 205, 144, 0.2)', color: 'rgb(120, 90, 20)', border: '1px solid rgba(219, 205, 144, 0.5)' }}>
            Most Clicked
          </span>
        </div>
        <TrendingBooks />
      </section>

      {/* AI Recommendations for You */}
      {isAuthenticated() && (
        <section className="mt-12 max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-6">
            <h2
              className="text-2xl font-bold tracking-tight text-center"
              style={{ color: 'rgb(30, 41, 59)', fontFamily: 'Montserrat, sans-serif' }}
            >
              AI Recommendations for You
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={recsRefreshing || recsLoading}
              className="text-xs px-3 py-1 h-7 border-teal-400/50 text-teal-300 hover:bg-teal-400/10 transition-all duration-300"
            >
              {recsRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {/* Loading state */}
          {recsLoading && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl p-4 animate-pulse"
                  style={{
                    background: 'linear-gradient(135deg, rgba(74, 0, 127, 0.08) 0%, rgba(0, 230, 230, 0.08) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    minHeight: '200px',
                  }}
                >
                  <div className="h-4 bg-white/10 rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-white/10 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-white/10 rounded w-full mb-2"></div>
                  <div className="h-3 bg-white/10 rounded w-5/6"></div>
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {!recsLoading && recsError && (
            <div
              className="text-center p-6 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(74, 0, 127, 0.08) 0%, rgba(0, 230, 230, 0.08) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <p className="text-red-300 text-sm mb-2">{recsError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRecommendations}
                className="text-xs border-red-400/40 text-red-300 hover:bg-red-400/10"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!recsLoading && !recsError && recsEmpty && (
            <div
              className="text-center p-6 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(74, 0, 127, 0.08) 0%, rgba(0, 230, 230, 0.08) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <p className="text-white/70 text-sm">
                Add more books to your library to unlock AI-powered recommendations!
              </p>
            </div>
          )}

          {/* Recommendation cards */}
          {!recsLoading && !recsError && !recsEmpty && aiRecommendations.length > 0 && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {aiRecommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-xl p-4 flex flex-col gap-2 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(74, 0, 127, 0.1) 0%, rgba(0, 230, 230, 0.1) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {/* Match score badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-block px-2 py-0.5 text-xs font-bold rounded-full"
                      style={{
                        backgroundColor: 'rgba(94, 234, 212, 0.2)',
                        color: 'rgb(94, 234, 212)',
                        border: '1px solid rgba(94, 234, 212, 0.3)',
                      }}
                    >
                      {Math.round(rec.matchScore)}% Match
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="font-semibold text-white text-sm line-clamp-2"
                    style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}
                  >
                    {rec.title}
                  </h3>

                  {/* Author */}
                  <p className="text-xs text-white/70">by {rec.author}</p>

                  {/* Reason */}
                  {rec.reason && (
                    <p className="text-xs text-white/60 italic line-clamp-3 leading-relaxed">
                      &ldquo;{rec.reason}&rdquo;
                    </p>
                  )}

                  {/* Similar to */}
                  {rec.similarTo && (
                    <div className="mt-auto pt-2 border-t border-white/10">
                      <p className="text-[10px] text-white/50">
                        Because you read:{' '}
                        <span className="text-white/70 font-medium">{rec.similarTo}</span>
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Features Section with Logo */}
      <section className="mt-12 space-y-6">
        {/* Centered Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/bookpath_logo_bordered_golden_updated.webp"
            alt="BookPath Golden Logo"
            className="max-w-[120px] w-full h-auto drop-shadow-lg"
            style={{ filter: 'drop-shadow(0 2px 8px rgba(219, 205, 144, 0.5))' }}
          />
        </div>
        
        {/* Second Featured Books Heading (Golden) */}
        <h2 className="text-xl font-bold tracking-tight mb-6 text-center" style={{ color: 'rgb(219, 205, 144)', fontFamily: 'Montserrat, sans-serif' }}>
          Featured Books
        </h2>
        
        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
          <div className="space-y-2 text-center">
            <h3 className="text-base font-bold" style={{ fontFamily: 'Montserrat, sans-serif', color: 'rgb(219, 205, 144)' }}>
              Track Your Reading
            </h3>
            <p className="text-sm" style={{ fontFamily: 'Open Sans, sans-serif', color: 'rgb(30, 41, 59)' }}>
              Keep track of the books you've read and want to read, with a beautiful and intuitive interface.
            </p>
          </div>
          <div className="space-y-2 text-center">
            <h3 className="text-base font-bold" style={{ fontFamily: 'Montserrat, sans-serif', color: 'rgb(219, 205, 144)' }}>
              Create Collections
            </h3>
            <p className="text-sm" style={{ fontFamily: 'Open Sans, sans-serif', color: 'rgb(30, 41, 59)' }}>
              Organize your books into custom collections, share them, and personalize your reading journey.
            </p>
          </div>
          <div className="space-y-2 text-center">
            <h3 className="text-base font-bold" style={{ fontFamily: 'Montserrat, sans-serif', color: 'rgb(219, 205, 144)' }}>
              AI-Powered Discovery
            </h3>
            <p className="text-sm" style={{ fontFamily: 'Open Sans, sans-serif', color: 'rgb(30, 41, 59)' }}>
              Find your next favorite book with smart recommendations and advanced search powered by AI.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
} 