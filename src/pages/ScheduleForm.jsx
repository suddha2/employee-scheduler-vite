import React, { useState } from 'react';
import {
    Stack,
    TextField,
    Button,
    ToggleButtonGroup,
    ToggleButton,
    Typography,
    Tooltip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { Autocomplete } from '@mui/material';
import { differenceInDays } from 'date-fns';
import dayjs from 'dayjs';
import { API_ENDPOINTS } from '../api/endpoint';
import { safeStorage } from '../utils/safeStorage';

export default function ScheduleForm({ locations, onSubmitSuccess, setSnackbar,setRequests }) {
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [location, setLocation] = useState(null);
    const [profile, setProfile] = useState('SPREAD');
    const [errors, setErrors] = useState({});

    const validate = () => {
        const newErrors = {};
        if (!startDate) newErrors.startDate = 'Start date is required';
        if (!endDate) newErrors.endDate = 'End date is required';

        if (startDate && endDate) {
            const diff = differenceInDays(endDate, startDate);
            if (diff < 1) newErrors.dateRange = 'Select a future End Date';
            if (diff > 30) newErrors.dateRange = 'Date range must be 1–30 days';
        }

        if (!location) newErrors.location = 'Location is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async () => {
        if (!validate()) return;

        try {
            const payload = {
                location: location.region,
                startDate: dayjs(startDate).format('YYYY-MM-DD'),
                endDate: dayjs(endDate).format('YYYY-MM-DD'),
                profile,
            };
            const response = await fetch(API_ENDPOINTS.enqueueRequest, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${safeStorage.get('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error('Submission failed');

            const result = await response.json();
            setSnackbar({ open: true, message: `Schedule submitted for ${location.region}`, severity: 'success' });
            onSubmitSuccess(result);

            //setRequests(prev => [...prev, result]);
            // Re-fetch the updated list
            //await fetchRequests(); // ← this updates the list from backend

        } catch (error) {
            // console.log("^^^^^^^^^^^^^^^^^^^^^^^^^",error);
            setSnackbar({ open: true, message: 'Submission failed', severity: 'error' });
        }
    };



    return (
        <Stack spacing={3} sx={{ mt: 2 }}>
            <DatePicker
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
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
                onChange={setEndDate}
                format="dd/MM/yyyy"
                slotProps={{
                    textField: {
                        fullWidth: true,
                        error: !!errors.endDate || !!errors.dateRange,
                        helperText: errors.endDate || errors.dateRange || '',
                    },
                }}
            />
            <Autocomplete
                options={locations}
                getOptionLabel={(opt) => opt.region || ''}
                value={location}
                onChange={(e, val) => setLocation(val)}
                isOptionEqualToValue={(opt, val) => opt.id === val?.id}
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
            <div>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Solve mode
                </Typography>
                <ToggleButtonGroup
                    value={profile}
                    exclusive
                    fullWidth
                    size="small"
                    onChange={(e, val) => { if (val) setProfile(val); }}
                >
                    <Tooltip title="Even hours across the whole team; avoids overloading. Lower week-to-week continuity.">
                        <ToggleButton value="SPREAD">Spread</ToggleButton>
                    </Tooltip>
                    <Tooltip title="Keeps carers in their prior-period slots / stable weekly pattern. Uses fewer carers; some may fall below minimum hours.">
                        <ToggleButton value="CONTINUITY">Continuity</ToggleButton>
                    </Tooltip>
                </ToggleButtonGroup>
            </div>
            <Button variant="contained" color="primary" fullWidth onClick={handleSubmit}>
                Submit
            </Button>
        </Stack>
    );
}
