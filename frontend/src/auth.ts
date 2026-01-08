import api from './api';

const TOKEN_KEY = 'auth_token';

export const login = async (email: string, password: string) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    console.log('Login response:', response.data); // Debug log
    const { accessToken } = response.data;
    
    if (!accessToken) {
      console.error('No accessToken in response:', response.data);
      return false;
    }
    
    localStorage.setItem(TOKEN_KEY, accessToken);
    console.log('Token stored successfully'); // Debug log
    return true;
  } catch (error: any) {
    console.error('Login failed:', error);
    console.error('Error response:', error.response?.data);
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