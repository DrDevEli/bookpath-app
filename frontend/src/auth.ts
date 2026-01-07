import api from './api';

const TOKEN_KEY = 'auth_token';

export const login = async (email: string, password: string) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken } = response.data;
    localStorage.setItem(TOKEN_KEY, accessToken);
    return true;
  } catch (error) {
    console.error('Login failed:', error);
    return false;
  }
};

export const register = async (name: string, email: string, password: string) => {
  const response = await api.post('/auth/register', { name, email, password });
  return response.data;
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const isAuthenticated = () => {
  return !!localStorage.getItem(TOKEN_KEY);
};

export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
}; 