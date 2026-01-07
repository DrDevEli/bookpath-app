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

export default api; 