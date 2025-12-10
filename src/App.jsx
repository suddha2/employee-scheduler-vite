import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import EmployeeList from './pages/EmployeeList';
import EmployeeForm from './pages/EmployeeForm';
import SubmitSchedule from './pages/SubmitSchedule';
import ViewSchedules from './pages/ViewSchedules';
import PayCycleSchedule from './pages/PayCycleScheduleView';
import ServiceStatsView from './pages/ServiceStatsView';
import EmpStatsView from './pages/EmpStatsView';
import { AxiosInterceptorSetup } from './components/AxiosInterceptorSetup';

export default function App() {
  return (
    <ErrorBoundary>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Router>
          <AuthProvider>
            <AxiosInterceptorSetup />
            <Navbar />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/login" element={<LoginPage />} />
              
              {/* Protected Routes - Wrapped in Layout */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Employee Management */}
              <Route 
                path="/employees" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <EmployeeList />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/employees/create" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <EmployeeForm />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/employees/edit/:id" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <EmployeeForm />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Scheduling */}
              <Route 
                path="/paycycleSchedule" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PayCycleSchedule />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/submit" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <SubmitSchedule />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/schedules" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ViewSchedules />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Statistics */}
              <Route 
                path="/servicestats" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ServiceStatsView />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/empstats" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <EmpStatsView />
                    </Layout>
                  </ProtectedRoute>
                } 
              /> 
            </Routes>
          </AuthProvider>
        </Router>
      </LocalizationProvider>
    </ErrorBoundary>
  );
}
