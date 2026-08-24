import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { isAuthenticated, logout, getUserRole } from '../../auth';
import { getMarket, setMarket, type Market } from '../../lib/market';

export function Header() {
  const navigate = useNavigate();
  const loggedIn = isAuthenticated();
  const role = getUserRole();
  const [market, setMarketState] = useState<Market>(getMarket());

  const handleMarketChange = (m: Market) => {
    setMarket(m);
    setMarketState(m);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    window.location.reload(); // Refresh to update UI
  };

  return (
    <header className="w-full border-b border-gray-200 bg-transparent backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img
            src="/bookpath_logo_option3_updated.png"
            alt="BookPath Logo"
            className="h-10 w-auto"
          />
          <span className="text-xl font-bold" style={{ color: 'rgb(30, 41, 59)', fontFamily: 'Montserrat, sans-serif' }}>
            BookPath
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className="text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: 'rgb(219, 205, 144)' }}
          >
            Home
          </Link>
          <Link
            to="/search"
            className="text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: 'rgb(219, 205, 144)' }}
          >
            Books
          </Link>
          {loggedIn && (
            <>
              <Link
                to="/collections"
                className="text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ color: 'rgb(219, 205, 144)' }}
              >
                Collections
              </Link>
              <Link
                to="/library"
                className="text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ color: 'rgb(219, 205, 144)' }}
              >
                My Library
              </Link>
              {role === 'admin' && (
                <Link
                  to="/analytics"
                  className="text-sm font-medium hover:opacity-80 transition-opacity"
                  style={{ color: 'rgb(219, 205, 144)' }}
                >
                  Analytics
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          {/* Storefront toggle — picks the Amazon marketplace for affiliate links */}
          <div className="flex items-center gap-1 border border-gray-200 rounded-full px-1 py-0.5 bg-white/60 backdrop-blur-sm">
            {(['de', 'us'] as Market[]).map((m) => (
              <button
                key={m}
                onClick={() => handleMarketChange(m)}
                className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                  market === m
                    ? 'bg-gradient-to-r from-primary to-teal text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                title={m === 'de' ? 'Amazon.de store' : 'Amazon.com store'}
              >
                {m === 'de' ? '🇩🇪 DE' : '🇺🇸 US'}
              </button>
            ))}
          </div>
          {loggedIn ? (
            <>
              <Button
                variant="ghost"
                asChild
                className="text-sm font-medium hover:bg-transparent"
                style={{ color: 'rgb(219, 205, 144)' }}
              >
                <Link to="/profile">Profile</Link>
              </Button>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="text-sm font-medium hover:bg-transparent"
                style={{ color: 'rgb(219, 205, 144)' }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                asChild
                className="text-sm font-medium hover:bg-transparent"
                style={{ color: 'rgb(219, 205, 144)' }}
              >
                <Link to="/login">Sign in</Link>
              </Button>
              <Button
                asChild
                className="text-sm font-medium bg-white text-black hover:bg-gray-100 border border-gray-200"
              >
                <Link to="/register">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
