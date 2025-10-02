// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import MainLayout from './pages/layout/MainLayout';
import MinimalLayout from './pages/layout/MinimalLayout';

import LoginPage from './pages/authentication/Login';
import ForgotPassword from './pages/authentication/ForgotPassword';
import Dashboard from './pages/dashboard/Dashboard';
// import ShiftsPage from './pages/shifts/ShiftsPage';
// import EmployeesPage from './pages/employees/EmployeesPage';

import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>

      <Routes>
        {/* Default redirect */}
        <Route
          path="/"
          element={
            localStorage.getItem('token')
              ? <Navigate to="/dashboard" replace />
              : <Navigate to="/login" replace />
          }
        />
        {/* Login route */}
        <Route
          path="/login"
          element={
            <Box
              sx={{
                width: '100vw',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
                px: 2, // small padding for mobile
              }}
            >
              <LoginPage />
            </Box>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <MinimalLayout>
              <ForgotPassword />
            </MinimalLayout>
          }
        />

        {/* Protected Pages */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/shifts"
          element={
            <PrivateRoute>
              <MainLayout>
                {/* <ShiftsPage /> */}
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <PrivateRoute>
              <MainLayout>
                {/* <EmployeesPage /> */}
              </MainLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
