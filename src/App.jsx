
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import SubmitSchedule from './pages/SubmitSchedule';
import ViewSchedules from './pages/ViewSchedules';
import PayCycleSchedule from './pages/PayCycleScheduleView';

export default function App() {



  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
       
        <Router>
       
          <Navbar />
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/paycycleSchedule" element={<PayCycleSchedule />} />
            <Route path="/submit" element={<SubmitSchedule />} />
            <Route path="/schedules" element={<ViewSchedules />} />
          </Routes>
        </Router>
       
    </LocalizationProvider>
  );
}
