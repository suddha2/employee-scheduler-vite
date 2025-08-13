import React, { useState } from 'react';
import {
  Container,
  TextField,
  Button,
  MenuItem,
  Typography,
  Box,
  Paper,
  Stack,
  Alert,
  Snackbar
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Autocomplete } from '@mui/material';
import { differenceInDays } from 'date-fns';
import useSWR from "swr";
import dayjs from 'dayjs';
import { API_ENDPOINTS } from '../api/endpoint';

//const locations = ['New York', 'London', 'Tokyo', 'Remote'];
const fetcher = (url) => fetch(url).then((res) => res.json());

export default function SubmitSchedule() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success', }); // can be 'error', 'info', 'warning'
  const { data: locations, error } = useSWR(API_ENDPOINTS.locations, fetcher);
  if (error) { console.log(error); return <div>Error loading locations</div>; }
  if (!locations) return <div>Loading...</div>;
  const validate = () => {
    const newErrors = {};

    if (!startDate) newErrors.startDate = "Start date is required";
    if (!endDate) newErrors.endDate = "End date is required";

    if (startDate && endDate) {
      const diff = differenceInDays(endDate, startDate);
      if (diff < 1) {
        newErrors.dateRange = "Select a future End Date";
      }
      if (diff > 30) {
        newErrors.dateRange = "Date difference must be between 1 and 30 days";
      }
    }

    if (!location) newErrors.location = "Location is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;

  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const payload = {
        location: location.region,  // use location.id
        startDate: dayjs(startDate).format('YYYY-MM-DD'),
        endDate: dayjs(endDate).format('YYYY-MM-DD'),
      };

      const response = await fetch(`${API_ENDPOINTS.enqueueSolve}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to submit schedule');
      }

      const result = await response.json();
      setSnackbar({ open: true, message: `Schedule submitted for ${location}`, severity: 'success', });

      // Optionally reset form
      setStartDate(null);
      setEndDate(null);
      setLocation(null);
      setErrors({});
    } catch (error) {
      console.error(error);
      alert('Error submitting schedule. Please try again.');
    }
  };


  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="sm" sx={{ mt: 6 }}>
        <Paper elevation={4} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            Smart Scheduling
          </Typography>

          <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
            <Stack spacing={3}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                format="dd/MM/yyyy"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.startDate || !!errors.dateRange,
                    helperText: errors.startDate || errors.dateRange || '',
                  },
                }}
              />

              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                format="dd/MM/yyyy"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.endDate || !!errors.dateRange,
                    helperText: errors.endDate || errors.dateRange || '',
                  },
                }}
              />

              <Autocomplete options={locations || []} getOptionLabel={(option) => option.region || ''} value={location || null} onChange={(event, newValue) => { setLocation(newValue); }}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Location"
                    fullWidth
                    error={!!errors.location}
                    helperText={errors.location}
                  />
                )}
              />
              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2 }}
                onClick={handleSubmit}
              >
                Submit
              </Button>
              <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              >
                <Alert
                  onClose={() => setSnackbar({ ...snackbar, open: false })}
                  severity={snackbar.severity}
                  sx={{ width: '100%' }}
                  variant="filled"
                >
                  {snackbar.message}
                </Alert>
              </Snackbar>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </LocalizationProvider>

  );
}
