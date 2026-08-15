// Domain configuration for BookPath application
export const DOMAIN_CONFIG = {
  // Production domain
  PRODUCTION: {
    FRONTEND: process.env.REACT_APP_FRONTEND_URL || 'https://bookpath.org',
    // Same-origin API: nginx on bookpath.org proxies /api -> backend (127.0.0.1:3001).
    // Empty string makes api.ts fall back to a relative /api base, so there is no
    // cross-origin request, no CORS, and no api.bookpath.org DNS/cert to maintain.
    BACKEND: process.env.REACT_APP_BACKEND_URL || '',
  },
  
  // Development domain
  DEVELOPMENT: {
    FRONTEND: 'http://localhost:3000',
    BACKEND: 'http://localhost:3001',
  },
  
  // Get current environment URLs
  getCurrentUrls() {
    const isProduction = process.env.NODE_ENV === 'production';
    return isProduction ? this.PRODUCTION : this.DEVELOPMENT;
  },
  
  // Get frontend URL
  getFrontendUrl() {
    return this.getCurrentUrls().FRONTEND;
  },
  
  // Get backend URL
  getBackendUrl() {
    return this.getCurrentUrls().BACKEND;
  },
};

export default DOMAIN_CONFIG;

// Add empty export to make this a module
export {}; 