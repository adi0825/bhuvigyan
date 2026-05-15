import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear auth state silently and let ProtectedRoute redirect
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      // Dispatch custom event so AuthContext updates in the same tab
      window.dispatchEvent(new CustomEvent('bhuvigyan:auth:clear'));
      console.warn('[axios] 401 received — auth cleared');
    }

    if (error.response) {
      const data = error.response.data as any;
      const serverMessage = data?.error?.message || data?.detail;
      error.message = serverMessage || error.message;
    } else if (error.request) {
      error.message = 'Network error - server not responding';
    }

    return Promise.reject(error);
  }
);

export default api;