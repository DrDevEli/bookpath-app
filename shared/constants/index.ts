// Shared constants for BookPath application

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL: 3600, // 1 hour
  MAX_SIZE: 1000,
  PREFIX: 'bookpath:',
} as const;

// Rate Limiting
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  SKIP_SUCCESSFUL_REQUESTS: false,
} as const;

// Authentication
export const AUTH_CONFIG = {
  JWT_EXPIRES_IN: '24h',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// File Upload
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain'],
  UPLOAD_DIR: 'uploads',
} as const;

// Book Categories
export const BOOK_CATEGORIES = {
  FICTION: 'fiction',
  NON_FICTION: 'non-fiction',
  SCIENCE_FICTION: 'science-fiction',
  FANTASY: 'fantasy',
  MYSTERY: 'mystery',
  ROMANCE: 'romance',
  THRILLER: 'thriller',
  BIOGRAPHY: 'biography',
  HISTORY: 'history',
  SCIENCE: 'science',
  TECHNOLOGY: 'technology',
  PHILOSOPHY: 'philosophy',
  RELIGION: 'religion',
  SELF_HELP: 'self-help',
  BUSINESS: 'business',
  COOKING: 'cooking',
  TRAVEL: 'travel',
  POETRY: 'poetry',
  DRAMA: 'drama',
  CHILDREN: 'children',
} as const;

// Collection Categories
export const COLLECTION_CATEGORIES = {
  GENERAL: 'general',
  WISHLIST: 'wishlist',
  FAVORITES: 'favorites',
  CURRENTLY_READING: 'currently-reading',
  COMPLETED: 'completed',
  CUSTOM: 'custom',
} as const;

// Reading Status
export const READING_STATUS = {
  TO_READ: 'to-read',
  READING: 'reading',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
  DNF: 'dnf',
} as const;

// Sort Options
export const SORT_OPTIONS = {
  ADDED_AT: 'addedAt',
  TITLE: 'title',
  AUTHOR: 'author',
  RATING: 'rating',
  DATE_FINISHED: 'dateFinished',
} as const;

// Sort Orders
export const SORT_ORDERS = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

// UI Configuration
export const UI_CONFIG = {
  THEME_COLORS: {
    PRIMARY: '#3B82F6',
    SECONDARY: '#6B7280',
    SUCCESS: '#10B981',
    WARNING: '#F59E0B',
    ERROR: '#EF4444',
    INFO: '#3B82F6',
  },
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    '2XL': 1536,
  },
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  RATE_LIMIT_ERROR: 'Too many requests. Please try again later.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  CREATED: 'Successfully created.',
  UPDATED: 'Successfully updated.',
  DELETED: 'Successfully deleted.',
  SAVED: 'Successfully saved.',
  LOGGED_IN: 'Successfully logged in.',
  LOGGED_OUT: 'Successfully logged out.',
  REGISTERED: 'Successfully registered.',
  PASSWORD_CHANGED: 'Password successfully changed.',
  EMAIL_SENT: 'Email sent successfully.',
} as const;

// Validation Messages
export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required.',
  EMAIL: 'Please enter a valid email address.',
  MIN_LENGTH: (min: number) => `Must be at least ${min} characters.`,
  MAX_LENGTH: (max: number) => `Must be no more than ${max} characters.`,
  PATTERN: 'Please enter a valid value.',
  PASSWORD_MATCH: 'Passwords do not match.',
  PASSWORD_STRENGTH: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  THEME: 'theme',
  LANGUAGE: 'language',
  PREFERENCES: 'preferences',
} as const;

// Route Paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  COLLECTIONS: '/collections',
  COLLECTION_DETAIL: '/collections/:id',
  SEARCH: '/search',
  BOOK_DETAIL: '/books/:id',
  SETTINGS: '/settings',
  ABOUT: '/about',
  HELP: '/help',
  PRIVACY: '/privacy',
  TERMS: '/terms',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY: '/auth/verify',
  },
  USERS: {
    PROFILE: '/users/profile',
    UPDATE: '/users/update',
    PASSWORD: '/users/password',
  },
  BOOKS: {
    SEARCH: '/books/search',
    DETAIL: '/books/:id',
    RECOMMENDATIONS: '/books/recommendations',
  },
  COLLECTIONS: {
    LIST: '/collections',
    CREATE: '/collections',
    DETAIL: '/collections/:id',
    UPDATE: '/collections/:id',
    DELETE: '/collections/:id',
    SHARE: '/collections/:id/share',
    STATS: '/collections/:id/stats',
    SEARCH: '/collections/:id/search',
  },
  HEALTH: '/health',
} as const;

// Export all constants
export * from './api';
export * from './validation';
export * from './ui'; 