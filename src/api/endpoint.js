export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const API_ENDPOINTS = {
  // Authentication
  login: `${API_BASE_URL}/login`,
  
  // Locations/Regions
  locations: `${API_BASE_URL}/api/regions`,
  
  // Employee Management
  employees: `${API_BASE_URL}/api/employees`,
  employeeById: (id) => `${API_BASE_URL}/api/employees/${id}`,
  
  // Scheduling
  enqueueRequest: `${API_BASE_URL}/api/enqueueRequest`,
  enqueueList: `${API_BASE_URL}/api/enqueue/latest`,
  solvedSchedule: `${API_BASE_URL}/api/solved`,
  updateSolvedSol: `${API_BASE_URL}/api/save`,
  payCycleSchedule: `${API_BASE_URL}/api/payCycle`,
  
  // Downloads & Exports
  csvDownload: `${API_BASE_URL}/api/download/schedule`,
  exportStats: `${API_BASE_URL}/api/stats/exportStats`,
  
  // Statistics
  serviceStats: `${API_BASE_URL}/api/stats/serviceStats`,
  empStats: `${API_BASE_URL}/api/stats/empStats`,
  
  // WebSocket
  websoc: `${API_BASE_URL}/ws`,
};

export default API_ENDPOINTS;
