import { useState, useEffect } from 'react';
import {
    Box,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    Card,
    CardContent,
    Typography,
    Grid,
    CircularProgress,
    Alert,
    Autocomplete, TextField, Button, LinearProgress

} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useRequestUpdates } from '../components/useRequestUpdates';

import { API_ENDPOINTS } from '../api/endpoint';
import axiosInstance from '../components/axiosInstance';

export default function PayCycleSchedule() {
    const [location, setLocation] = useState([]);
    const [locations, setLocations] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [loadingLocations, setLoadingLocations] = useState(true);
    const [loadingPeriods, setLoadingPeriods] = useState(false);
    const [error, setError] = useState(null);
    const [submissionStatus, setSubmissionStatus] = useState({});
    const [requests, setRequests] = useState([]);


    const updateRequestStatus = (periodUpdateList) => {
        if (!Array.isArray(periodUpdateList) || periodUpdateList.length === 0) return;

        const periodUpdate = periodUpdateList[0]; // extract the single object. This is required since the backend sends an array.

        setPeriods(prev =>
            prev.map(p => (p.id === periodUpdate.id ? { ...p, ...periodUpdate } : p))
        );

        setSubmissionStatus(prev => ({
            ...prev,
            [periodUpdate.id]: {
                loading: false,
                success: true,
                error: null,
                reloadedPeriod: periodUpdate,
                showUpdateIndicator: true
            }
        }));
        setTimeout(() => {
            setSubmissionStatus(prev => ({
                ...prev,
                [periodUpdate.id]: {
                    ...prev[periodUpdate.id],
                    showUpdateIndicator: false
                }
            }));
        }, 2000);
    };
    const navigate = useNavigate();
    const ws = useRequestUpdates(setRequests, updateRequestStatus);
    function loadCardData(location) {
        if (!location) return;

        setLoadingPeriods(true);
        axiosInstance
            .get(`${API_ENDPOINTS.payCycleSchedule}?location=${location.label}`)
            .then((res) => setPeriods(res.data))
            .catch((err) => {
                console.error(err);
                setError('Failed to load schedule periods');
            })
            .finally(() => setLoadingPeriods(false));
    }

    // Fetch available locations on mount
    useEffect(() => {
        axiosInstance
            .get(API_ENDPOINTS.locations, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            })
            .then((res) => {
                const formatted = res.data.map((loc) => ({
                    value: loc.code,
                    label: loc.region,
                }));
                setLocations(formatted);
            })
            .catch((err) => {
                console.error(err);
                setError('Failed to load locations');
            })
            .finally(() => setLoadingLocations(false));
    }, []);
    const handleViewClick = (id) => {
        console.log("handleViewClick = ", id);
        navigate(`/schedules?id=${id}`);
    }
    const handleCardSubmit = async (period) => {
        const { startDate, endDate } = period;

        setSubmissionStatus(prev => ({
            ...prev,
            [period.id]: { loading: true, success: false, error: null, reloadedPeriod: null }
        }));

        try {
            const payload = {
                location: location.label,
                startDate,
                endDate
            };

            const response = await fetch(API_ENDPOINTS.enqueueRequest, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Submission failed');

            // Re-fetch just this period
            const refreshed = await axiosInstance.get(`${API_ENDPOINTS.payCycleSchedule}?location=${location.label}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });
            const updatedPeriod = refreshed.data.find(p => p.id === period.id);

            setSubmissionStatus(prev => ({
                ...prev,
                [period.id]: {
                    loading: false,
                    success: true,
                    error: null,
                    reloadedPeriod: updatedPeriod || null
                }
            }));
        } catch (err) {
            setSubmissionStatus(prev => ({
                ...prev,
                [period.id]: { loading: false, success: false, error: err.message, reloadedPeriod: null }
            }));
        }
    };


    return (
        <Box sx={{ p: 2 }}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loadingLocations ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Box sx={{ mb: 3, pt: 10, pb: 2, minWidth: 300 }}>

                    <Autocomplete
                        options={locations}
                        getOptionLabel={(opt) => opt.label || ''}
                        value={location}
                        onChange={(e, val) => {
                            const matched = locations.find(loc => loc.value === val?.value);
                            setLocation(matched || null);
                            if (matched) loadCardData(matched);
                        }}
                        isOptionEqualToValue={(opt, val) => opt.value === val?.value}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Location"
                                fullWidth
                            />
                        )}
                    />
                </Box>
            )}

            {loadingPeriods ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {periods.map((period, index) => {
                        const currentPeriod = submissionStatus[period.id]?.reloadedPeriod || period;

                        return (
                            <Grid item xs={12} sm={6} md={4} key={currentPeriod.id}>
                                <Card variant="outlined" sx={{
                                    position: 'relative',
                                    animation: submissionStatus[period.id]?.showUpdateIndicator ? 'pulse 1s ease-in-out infinite' : 'none',
                                    '@keyframes pulse': {
                                        '0%': { transform: 'scale(1)', boxShadow: '0 0 5px #4caf50' },
                                        '50%': { transform: 'scale(1.02)', boxShadow: '0 0 15px #81c784' },
                                        '100%': { transform: 'scale(1)', boxShadow: '0 0 5px #4caf50' },
                                    },
                                }} >
                                    <CardContent sx={{ position: 'relative' }}>
                                        {submissionStatus[currentPeriod.id]?.showUpdateIndicator && (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    top: 8,
                                                    right: 8,
                                                    backgroundColor: 'success.main',
                                                    color: 'white',
                                                    px: 1,
                                                    py: 0.5,
                                                    borderRadius: 1,
                                                    fontSize: '0.75rem',
                                                    zIndex: 10,
                                                    animation: 'pulse 1s ease-in-out infinite',
                                                    '@keyframes pulse': {
                                                        '0%': { transform: 'scale(1)', opacity: 1 },
                                                        '50%': { transform: 'scale(1.1)', opacity: 0.7 },
                                                        '100%': { transform: 'scale(1)', opacity: 1 },
                                                    },
                                                }}
                                            >
                                                Updated
                                            </Box>
                                        )}
                                        {/* Use currentPeriod instead of period below */}
                                        <Typography variant="h6">
                                            {location.label} | Period {index + 1}
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary">
                                            {currentPeriod.startDate} → {currentPeriod.endDate}
                                        </Typography>

                                        <Box sx={{ mt: 1 }}>
                                            <Alert
                                                severity={currentPeriod.hasSolveRequest ? 'success' : 'warning'}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    '& .MuiAlert-icon': {
                                                        fontSize: '3rem',
                                                        mr: 2
                                                    }
                                                }}
                                            >
                                                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                                                    {currentPeriod.scheduleStatus}
                                                </Typography>

                                                {submissionStatus[currentPeriod.id]?.loading ? (
                                                    <CircularProgress size={24} />
                                                ) : submissionStatus[currentPeriod.id]?.error ? (
                                                    <Alert severity="error">{submissionStatus[currentPeriod.id].error}</Alert>
                                                ) : currentPeriod.hasSolveRequest && currentPeriod.solevReqStatus !== 'COMPLETED' ? (
                                                    <Button variant="outlined" disabled sx={{ opacity: 0.6 }}>
                                                        ⏳ Waiting for completion...
                                                    </Button>
                                                ) : currentPeriod.hasSolveRequest && currentPeriod.solevReqStatus === 'COMPLETED' ? (
                                                    <Button variant="contained" color="primary" onClick={() => handleViewClick(currentPeriod.rotaId)}>
                                                        View
                                                    </Button>
                                                ) : (
                                                    <Button variant="contained" color="primary" onClick={() => handleCardSubmit(period)}>
                                                        Generate
                                                    </Button>
                                                )}
                                            </Alert>
                                        </Box>

                                        {currentPeriod.hasSolveRequest && currentPeriod.solevReqStatus == "COMPLETED" && (
                                            <>
                                                <Typography variant="body2" sx={{ mt: 1 }}>
                                                    🧑 Employees: {currentPeriod.employeeCount}
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Typography variant="body2">
                                                        🗓️ Shifts: {currentPeriod.shiftCount}
                                                    </Typography>
                                                    <Box sx={{ position: 'relative', flexGrow: 1 }}>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={Math.round((currentPeriod.shiftAssignmentStats.TotalAssigned / currentPeriod.shiftCount) * 100)}
                                                            sx={{
                                                                height: 16,
                                                                borderRadius: 8,
                                                                bgcolor: '#eee',
                                                                '& .MuiLinearProgress-bar': {
                                                                    backgroundColor:
                                                                        currentPeriod.shiftAssignmentStats.TotalAssigned / currentPeriod.shiftCount >= 0.8
                                                                            ? 'success.main'
                                                                            : currentPeriod.shiftAssignmentStats.TotalAssigned / currentPeriod.shiftCount >= 0.5
                                                                                ? 'warning.main'
                                                                                : 'error.main',
                                                                },
                                                            }}
                                                        />
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: '50%',
                                                                transform: 'translateX(-50%)',
                                                                height: '100%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: currentPeriod.shiftAssignmentStats.TotalAssigned / currentPeriod.shiftCount > 0.8 ? 'common.white' : 'text.primary',
                                                                fontWeight: 500,
                                                            }}
                                                        >
                                                            {Math.round((currentPeriod.shiftAssignmentStats.TotalAssigned / currentPeriod.shiftCount) * 100)}%
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                {currentPeriod.shiftStats &&
                                                    Object.entries(currentPeriod.shiftStats).map(([type, count]) => (
                                                        <Box key={`${currentPeriod.id}-${type}`} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                            <Typography variant="body2" key={type} sx={{ pl: 2 }}>
                                                                • {type}: {count}
                                                            </Typography>
                                                            <Box sx={{ position: 'relative', width: 180, ml: 'auto' }}>

                                                                <LinearProgress
                                                                    variant="determinate"
                                                                    value={Math.round((currentPeriod.shiftAssignmentStats[type] / count) * 100)}
                                                                    sx={{
                                                                        width: '100%',
                                                                        height: 16,
                                                                        borderRadius: 8,
                                                                        bgcolor: '#eee',
                                                                        '& .MuiLinearProgress-bar': {
                                                                            backgroundColor:
                                                                                currentPeriod.shiftAssignmentStats[type] / count >= 0.8
                                                                                    ? 'success.main'
                                                                                    : currentPeriod.shiftAssignmentStats[type] / count >= 0.5
                                                                                        ? 'warning.main'
                                                                                        : 'error.main',
                                                                        },
                                                                    }}
                                                                />
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        position: 'absolute',
                                                                        top: 0,
                                                                        left: '50%',
                                                                        transform: 'translateX(-50%)',
                                                                        height: '100%',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        color: currentPeriod.shiftAssignmentStats[type] / count > 0.6 ? 'common.white' : 'text.primary',
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    {Math.round((currentPeriod.shiftAssignmentStats[type] / count) * 100)}%
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    ))}
                                                <Typography variant="body2">
                                                    📋 Services: {currentPeriod.locationCount}
                                                </Typography>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>

            )}
        </Box>
    );
}
