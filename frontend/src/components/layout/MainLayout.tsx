import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { isAuthenticated, logout } from '@/auth';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoggedIn = isAuthenticated();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/search', label: 'Search' },
    { path: '/category', label: 'Category' },
    ...(isLoggedIn ? [{ path: '/collections', label: 'Collections' }] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowUserMenu(false);
  };

  return (
    <div className="relative min-h-screen font-sans">
      {/* Fixed Background Layer */}
      <div
        className="fixed inset-0 z-0 bg-background"
        aria-hidden="true"
        style={{
          backgroundImage: 'url(/background_smooth.png)',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          pointerEvents: 'none',
        }}
      >
        {/* Shine animation removed */}
      </div>
      {/* Foreground Content Layer */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="fixed top-0 left-0 w-full z-30 border-b bg-opacity-90 backdrop-blur">
          <div className="container mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-6">
                <Link to="/" className="flex items-center gap-2">
                  <img src="/bookpath_logo_option3_updated.png" alt="BookPath Logo" className="h-10 w-auto" />
                  <span className="text-2xl font-heading" style={{ fontFamily: 'Montserrat, sans-serif', color: '#dbcd90' }}>BookPath</span>
                </Link>
                <nav className="hidden md:flex gap-6">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        location.pathname === item.path
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`}
                      style={{ fontFamily: 'Open Sans, sans-serif', color: '#dbcd90' }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="flex items-center gap-4">
                {isLoggedIn ? (
                  <div className="relative">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2"
                    >
                      <span>👤</span>
                      <span>Account</span>
                      <span className="text-xs">▼</span>
                    </Button>
                    
                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                        <Link
                          to="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowUserMenu(false)}
                        >
                          👤 Profile
                        </Link>
                        <Link
                          to="/collections"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowUserMenu(false)}
                        >
                          📚 My Collections
                        </Link>
                        <hr className="my-1" />
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          🚪 Logout
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    asChild 
                    style={{ 
                      color: '#dbcd90', 
                      border: '1.5px solid #dbcd90',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#dbcd90';
                      e.currentTarget.style.color = '#000000';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#dbcd90';
                    }}
                  >
                    <Link to="/login">Login</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 flex-1 pt-20">
          {children}
        </main>
        <footer className="border-t py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center justify-center mb-2 md:mb-0">
                <img src="/bookpath_logo_bordered_golden_updated.webp" alt="BookPath Logo" className="h-8 w-auto mr-2" />
                <p className="text-center text-sm" style={{ color: '#dbcd90' }}>
                  © {new Date().getFullYear()} BookPath. All rights reserved.
                </p>
              </div>
              <div className="flex gap-4 mt-4 md:mt-0">
                <Link to="/about" className="text-sm hover:underline" style={{ color: '#dbcd90' }}>
                  About
                </Link>
                <Link to="/privacy" className="text-sm hover:underline" style={{ color: '#dbcd90' }}>
                  Privacy
                </Link>
                <Link to="/terms" className="text-sm hover:underline" style={{ color: '#dbcd90' }}>
                  Terms
                </Link>
              </div>
            </div>
          </div>
        </footer>
        {/* Click outside to close user menu */}
        {showUserMenu && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowUserMenu(false)}
          />
        )}
      </div>
    </div>
  );
} 