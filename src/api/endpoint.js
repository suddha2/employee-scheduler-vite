export const API_BASE_URL =import.meta.env.VITE_API_BASE_URL;// "http://localhost:8080";

export const  API_ENDPOINTS = {
  login:`${API_BASE_URL}/login`,
  locations: `${API_BASE_URL}/api/regions`,
  enqueueRequest : `${API_BASE_URL}/api/enqueueRequest`,
  enqueueList : `${API_BASE_URL}/api/enqueue/latest`,
  solvedSchedule : `${API_BASE_URL}/api/solved`,
  updateSolvedSol : `${API_BASE_URL}/api/save`,
  websoc: `${API_BASE_URL}/ws`,

};

export default API_ENDPOINTS;