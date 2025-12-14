// api/axiosInstance.js
import axios from 'axios';
import {API_BASE_URL} from '../api/endpoint'

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Store the session expiry handler that will be set by setupInterceptors
let sessionExpiryHandler = null;

export function setupAuthInterceptor(handleSessionExpiry) {
  sessionExpiryHandler = handleSessionExpiry;
}

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  response => response, 
  error => {
    if (error.response?.status === 401) { 
      // Call the session expiry handler if it's set
      if (sessionExpiryHandler) {
        sessionExpiryHandler();
      } else {
        // Fallback to direct localStorage clear and redirect
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } 
    return Promise.reject(error); 
  }
);
    
export default axiosInstance;
