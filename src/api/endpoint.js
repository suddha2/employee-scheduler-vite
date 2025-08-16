export const API_BASE_URL =import.meta.env.VITE_API_BASE_URL;// "http://localhost:8080";

export const  API_ENDPOINTS = {
  login:`${API_BASE_URL}/login`,
  locations: `${API_BASE_URL}/api/regions`,
  enqueueSolve : `${API_BASE_URL}/api/enqueueSolve`,
  websoc: `${API_BASE_URL}/ws`,
};

export default API_ENDPOINTS;