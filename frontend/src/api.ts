import axios from 'axios';
import DOMAIN_CONFIG from './config/domain';

// Ensure API base URL includes /api suffix
const rawBase = process.env.REACT_APP_API_BASE_URL || DOMAIN_CONFIG.getBackendUrl();
const trimmedBase = (rawBase || '').replace(/\/+$/, '');
const API_BASE_URL = trimmedBase.endsWith('/api') ? trimmedBase : `${trimmedBase}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Library APIs
export const libraryAPI = {
  getLibrary: () => api.get('/library'),
  addBook: (book: any, shelf: string) => api.post('/library/books', { book, shelf }),
  updateBook: (bookId: string, updates: any) => api.put(`/library/books/${bookId}`, updates),
  removeBook: (bookId: string) => api.delete(`/library/books/${bookId}`),
  getStats: () => api.get('/library/stats'),
};

// Recommendations
export const recommendationsAPI = {
  getRecommendations: () => api.get('/recommendations'),
  refreshRecommendations: () => api.post('/recommendations/refresh'),
};

// Email capture (Phase 3 — builds the reactivation list; delivery gated on SMTP)
export const subscribersAPI = {
  subscribe: (email: string, source?: string, context?: string) =>
    api.post('/subscribers', { email, source, context }),
};

// Analytics (affiliate funnel KPIs)
export const analyticsAPI = {
  getTrending: (limit = 8) => api.get('/analytics/trending', { params: { limit } }),
  getOverview: () => api.get('/analytics/overview'),
  getTopBooks: (days = 30, limit = 10) => api.get('/analytics/top-books', { params: { days, limit } }),
  getTopQueries: (days = 30, limit = 10) => api.get('/analytics/top-queries', { params: { days, limit } }),
  getDaily: (days = 14) => api.get('/analytics/daily', { params: { days } }),
};

// Price helper - returns the best display price from API response
export const getDisplayPrice = (price: any) => {
  if (!price) return null;
  // Prefer paperback, fallback to kindle then hardcover
  const p = price.paperback || price.kindle || price.hardcover;
  return p ? { amount: p.amount, currency: p.currency } : null;
};

export default api;