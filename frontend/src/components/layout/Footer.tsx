import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 bg-transparent backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo and Copyright */}
          <div className="flex items-center gap-3">
            <img
              src="/bookpath_logo_bordered_golden_updated.webp"
              alt="BookPath Logo"
              className="h-8 w-auto mr-2"
            />
            <p className="text-sm" style={{ color: 'rgb(30, 41, 59)' }}>
              © 2026 BookPath. All rights reserved.
            </p>
          </div>

          {/* Footer Links */}
          <nav className="flex items-center gap-6">
            <Link
              to="/about"
              className="text-sm hover:opacity-80 transition-opacity"
              style={{ color: 'rgb(30, 41, 59)' }}
            >
              About
            </Link>
            <Link
              to="/privacy"
              className="text-sm hover:opacity-80 transition-opacity"
              style={{ color: 'rgb(30, 41, 59)' }}
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="text-sm hover:opacity-80 transition-opacity"
              style={{ color: 'rgb(30, 41, 59)' }}
            >
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
