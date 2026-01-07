import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function Header() {
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
            Dashboard
          </Link>
          <Link
            to="/search"
            className="text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: 'rgb(219, 205, 144)' }}
          >
            Books
          </Link>
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
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
        </div>
      </div>
    </header>
  );
}

export default Header;
