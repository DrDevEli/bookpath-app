import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import FeaturedBooks from '../components/FeaturedBooks';

const suggestedBooks = [
  {
    id: 4,
    title: "The Alchemist",
    author: "Paulo Coelho",
    description: "A magical story about following your dreams and listening to your heart.",
    cover: "https://covers.openlibrary.org/b/id/12749894-L.jpg",
    rating: 4.5,
    genre: "Fiction",
    price: 17.99
  },
  {
    id: 5,
    title: "Sapiens",
    author: "Yuval Noah Harari",
    description: "A brief history of humankind, from ancient humans to the present day.",
    cover: "https://covers.openlibrary.org/b/id/12749895-L.jpg",
    rating: 4.8,
    genre: "Non-Fiction",
    price: 22.49
  },
  {
    id: 6,
    title: "The Midnight Library",
    author: "Matt Haig",
    description: "Between life and death there is a library, and within that library, the shelves go on forever.",
    cover: "https://covers.openlibrary.org/b/id/12749896-L.jpg",
    rating: 4.3,
    genre: "Fiction",
    price: 14.25
  },
  {
    id: 7,
    title: "Atomic Habits",
    author: "James Clear",
    description: "Tiny changes, remarkable results: An easy & proven way to build good habits & break bad ones.",
    cover: "https://covers.openlibrary.org/b/id/12749897-L.jpg",
    rating: 4.7,
    genre: "Self-Help",
    price: 19.75
  }
];

export function Home() {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState(0);

  useEffect(() => {
    // Trigger suggestions animation after page loads
    const timer = setTimeout(() => {
      setShowSuggestions(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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
                        <span className="text-xs text-yellow-400 animate-pulse">
                          {getRatingStars(book.rating)}
                        </span>
                        <span className="text-xs text-white/60">
                          {book.rating}
                        </span>
                      </div>
                      <span className="inline-block px-1.5 py-0.5 bg-teal-500/20 text-teal-300 text-[10px] rounded-full border border-teal-400/30 transition-all duration-300 hover:bg-teal-500/30 hover:scale-105">
                        {book.genre}
                      </span>
                      {typeof book.price === 'number' && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-gradient-to-r from-yellow-200 via-yellow-300 to-yellow-400 text-yellow-900 text-[10px] font-bold rounded-full shadow-sm border border-yellow-300 ml-1">
                          ${book.price.toFixed(2)}
                        </span>
                      )}
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
      {/* Add Featured Books section here */}
      <FeaturedBooks />
      {/* Main Content */}
      <div className="mt-8 space-y-8">
        {/* Centered Logo Before Featured Books */}
        <div className="flex justify-center mb-2">
          <img
                            src="/bookpath_logo_bordered_golden_updated.webp"
            alt="BookPath Golden Logo"
            className="max-w-[120px] w-full h-auto drop-shadow-lg"
            style={{ filter: 'drop-shadow(0 2px 8px rgba(219, 205, 144, 0.5))' }}
          />
        </div>
        {/* Featured Books Section */}
        <section>
          <h2 className="text-xl font-bold tracking-tight mb-4 text-center" style={{ color: '#dbcd90', marginTop: '0.5rem' }}>Featured Books</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* The featuredBooks array is now managed by FeaturedBooks component */}
          </div>
        </section>

        {/* Features Section */}
        <section className="grid gap-2 md:grid-cols-3">
          <div className="space-y-1">
            <h3 className="text-base font-bold" style={{ fontFamily: 'Montserrat, sans-serif', color: '#dbcd90' }}>Track Your Reading</h3>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Open Sans, sans-serif', color: '#dbcd90' }}>
              Keep track of the books you've read and want to read, with a beautiful and intuitive interface.
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold" style={{ fontFamily: 'Montserrat, sans-serif', color: '#dbcd90' }}>Create Collections</h3>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Open Sans, sans-serif', color: '#dbcd90' }}>
              Organize your books into custom collections, share them, and personalize your reading journey.
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold" style={{ fontFamily: 'Montserrat, sans-serif', color: '#dbcd90' }}>AI-Powered Discovery</h3>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Open Sans, sans-serif', color: '#dbcd90' }}>
              Find your next favorite book with smart recommendations and advanced search powered by AI.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
} 