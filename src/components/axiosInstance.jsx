// api/axiosInstance.js
import axios from 'axios';
import API_BASE_URL from '../api/endpoint'

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
axiosInstance.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401) { // Token expired or invalid 
   localStorage.removeItem('token'); // optional: clear stale token
    window.location.href = '/login'; // force redirect 
   } 
   return Promise.reject(error); 
  } );
    
export default axiosInstance;
