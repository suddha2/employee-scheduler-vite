import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import SubmitSchedule from './pages/SubmitSchedule';
import ViewSchedules from './pages/ViewSchedules';
import {
  DndContext,

} from "@dnd-kit/core";
//import { scheduleData } from './data/schedule'; // Assuming schedule data is imported from a file
// import { employees } from './data/schedule'; // Assuming employee data is imported from a file
export default function App() {
  //const [schedule, setSchedule] = useState(scheduleData);
  //const [availableEmployees, setAvailableEmployees] = useState(employees);


  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
       
        <Router>
       
          <Navbar />
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/submit" element={<SubmitSchedule />} />
            <Route
              path="/schedules"
              element={
                <ViewSchedules

                />
              }
            />
          </Routes>
        </Router>
       
    </LocalizationProvider>
  );
}
