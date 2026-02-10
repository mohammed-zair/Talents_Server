import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'https://talents-we-trust.tech/api',
  timeout: 30000,
});

// Simple and reliable request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Prefer backend JWT token key used by Talents admin
    const token = localStorage.getItem('jwt_token') || localStorage.getItem('access_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
    if (isFormData) {
      delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Simple response interceptor - handle 401 by redirecting to login
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.log('Authentication failed, redirecting to login');
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('admin_session');

      const base = process.env.PUBLIC_URL || '/admin';
      const normalized = base.endsWith('/') ? base : `${base}/`;
      if (!window.location.pathname.startsWith(normalized)) {
        window.location.href = normalized;
      } else {
        window.location.href = normalized;
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
