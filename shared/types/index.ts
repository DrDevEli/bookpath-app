// Shared TypeScript types for BookPath application

// User types
export interface User {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  collectionsCount: number;
  booksCount: number;
  readingGoal?: number;
  readingProgress: number;
}

// Book types
export interface Book {
  _id?: string;
  bookId: string;
  title: string;
  authors: string[];
  description?: string;
  coverImage?: string;
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  isbn?: string;
  language?: string;
  genres?: string[];
  averageRating?: number;
  ratingsCount?: number;
}

export interface BookInCollection extends Book {
  addedAt: string;
  notes?: string;
  rating?: number;
  readStatus: ReadStatus;
  dateStarted?: string;
  dateFinished?: string;
  progress?: number;
  favorite?: boolean;
  personalTags?: string[];
}

export type ReadStatus = 'to-read' | 'reading' | 'completed' | 'abandoned' | 'dnf';

// Collection types
export interface Collection {
  _id: string;
  user: string | User;
  name: string;
  description?: string;
  books: BookInCollection[];
  isPublic: boolean;
  category: CollectionCategory;
  color: string;
  tags: string[];
  sortBy: SortOption;
  sortOrder: SortOrder;
  shareableLink?: string;
  collaborators?: Collaborator[];
  stats: CollectionStats;
  createdAt: string;
  updatedAt: string;
}

export type CollectionCategory = 'general' | 'wishlist' | 'favorites' | 'currently-reading' | 'completed' | 'custom';

export type SortOption = 'addedAt' | 'title' | 'author' | 'rating' | 'dateFinished';

export type SortOrder = 'asc' | 'desc';

export interface CollectionStats {
  totalBooks: number;
  completedBooks: number;
  averageRating: number;
  totalPages: number;
}

export interface Collaborator {
  user: string | User;
  role: 'viewer' | 'editor';
  addedAt: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: any;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  count: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Search and Filter types
export interface SearchFilters {
  query?: string;
  author?: string;
  genre?: string;
  publisher?: string;
  isbn?: string;
  minRating?: number;
  maxRating?: number;
  publishedAfter?: string;
  publishedBefore?: string;
  pageCountMin?: number;
  pageCountMax?: number;
  language?: string;
}

export interface CollectionFilters {
  category?: CollectionCategory;
  isPublic?: boolean;
  tags?: string[];
  hasBooks?: boolean;
  sortBy?: SortOption;
  sortOrder?: SortOrder;
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Error types
export interface ApiError {
  status: number;
  message: string;
  details?: any;
  code?: string;
}

// Notification types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'radio';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// UI Component types
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Environment types
export interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  MONGODB_URI: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  SESSION_SECRET: string;
  GOOGLE_BOOKS_API_KEY?: string;
  OPENAI_API_KEY?: string;
}

// Export all types
export * from './api';
export * from './validation'; 