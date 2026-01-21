// SubmitSchedule.jsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Snackbar,
  Alert,
  Box,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate } from 'react-router-dom';
import { useRequestUpdates } from '../components/useRequestUpdates';
import ScheduleForm from './ScheduleForm';
import ScheduleList from './ScheduleList';
import { API_ENDPOINTS } from '../api/endpoint';
import axiosInstance from '../components/axiosInstance';




export default function SubmitSchedule() {
  const [locations, setLocations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const updateRequestStatus = (updatedReq) => {


    setRequests((prev) => {


      return prev.map((req) => {
        const isMatch = req.id === updatedReq.id;
        if (isMatch) {

          return updatedReq; // Replace entire object
        }
        return req;
      });
    });
  };

  //const { rotaData } = useRotaWebSocket();
  const navigate = useNavigate();
  const ws = useRequestUpdates(setRequests, updateRequestStatus);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await axiosInstance.get(API_ENDPOINTS.locations, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        });
        setLocations(response.data);
      } catch (err) {
        console.error('Failed to load locations', err);
        setSnackbar({ open: true, message: 'Failed to load locations', severity: 'error' });
      }
    };

    fetchLocations();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.enqueueList, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setRequests(response.data);
    } catch (err) {
      console.error('Failed to fetch requests', err);
      setSnackbar({ open: true, message: 'Failed to load requests', severity: 'error' });
    }
  };
  useEffect(() => {
    fetchRequests();
  }, []);





  const handleNewRequest = (newRequest) => {
    setRequests((prev) => [...prev, newRequest]);
  };
  const handleView = (req) => {
    // console.log("submitSchedule->handleview->", req);
    navigate(`/schedules?id=${req.rotaId}`);
  }
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ mt: 6 }}>
        <Paper elevation={4} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            Smart Scheduling
          </Typography>

          {/* Flex layout with 40/60 split and divider */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              mt: 2,
            }}
          >
            {/* Left: Form (40%) */}
            <Box sx={{ flex: { md: '0 0 20%' }, width: '100%' }}>
              <ScheduleForm
                locations={locations}
                onSubmitSuccess={handleNewRequest}
                setSnackbar={setSnackbar}
                setRequests={setRequests}
              />
            </Box>

            {/* Divider */}
            <Box
              sx={{
                width: '1px',
                backgroundColor: 'grey.400',
                mx: 2,
                display: { xs: 'none', md: 'block' },
                alignSelf: 'stretch',
              }}
            />

            {/* Right: List (60%) */}
            <Box sx={{ flex: { md: '0 0 75%' }, width: '100%' }}>
              <ScheduleList requests={requests} onView={handleView} />
            </Box>
          </Box>

          {/* Snackbar */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert
              onClose={() => setSnackbar({ ...snackbar, open: false })}
              severity={snackbar.severity}
              variant="filled"
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Paper>
      </Container>
    </LocalizationProvider>



  );
}
