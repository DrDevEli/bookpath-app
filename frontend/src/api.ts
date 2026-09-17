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

// Tracks an in-flight silent refresh so concurrent 401s share one call.
let refreshPromise: Promise<boolean> | null = null;

const performRefresh = (): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const { accessToken } = res.data;
        if (accessToken) {
          localStorage.setItem('auth_token', accessToken);
          return true;
        }
        return false;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// Add response interceptor to handle auth errors:
// 401 -> one silent refresh attempt (httpOnly cookie) -> retry once.
// Only if refresh fails do we clear state and send the user to /login.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as any;
    // Never auto-redirect for endpoints that handle 401 themselves
    // (e.g. change-password wrong current password).
    if (config?.skipAuthRedirect) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !config?._retried) {
      const ok = await performRefresh();
      if (ok) {
        config._retried = true;
        const token = localStorage.getItem('auth_token');
        config.headers.Authorization = `Bearer ${token}`;
        return api(config);
      }
      // Refresh failed — session is truly dead.
      localStorage.removeItem('auth_token');
      localStorage.removeItem('bp_session');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Library APIs
// NOTE: the backend identifies library books by their Google volume id
// (`book.bookId`, e.g. "google-XXXX"), NOT by the Mongo _id. Paths are
// /library/books/* — see backend/src/routes/libraryRoutes.js.
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

// User / profile (account settings)
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: { username?: string; email?: string }) => api.put('/users/profile', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/users/password', { currentPassword, newPassword }, { skipAuthRedirect: true } as any),
  getPreferences: () => api.get('/users/preferences'),
  updatePreferences: (preferences: Record<string, unknown>) => api.put('/users/preferences', { preferences }),
};

// Price helper - returns the best display price from API response
export const getDisplayPrice = (price: any) => {
  if (!price) return null;
  // Prefer paperback, fallback to kindle then hardcover
  const p = price.paperback || price.kindle || price.hardcover;
  return p ? { amount: p.amount, currency: p.currency } : null;
};

export default api;