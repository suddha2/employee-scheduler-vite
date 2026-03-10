import { useState, useEffect } from 'react';
import {
    Box,
    Autocomplete,
    TextField,
    Button,
    Card,
    CardContent,
    Typography,
    Grid,
    CircularProgress,
    Alert,
    LinearProgress
} from '@mui/material';
import { Home, People, FileDownload } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { usePersistedState } from '../hooks/usePersistedState';
import { API_ENDPOINTS } from '../api/endpoint';
import axiosInstance from '../components/axiosInstance';

export default function ArchivedPayCycleView() {
    const [location, setLocation, clearLocation] = usePersistedState('archived_paycycle_location', null);
    const [locations, setLocations] = useState([]);
    const [loadingLocations, setLoadingLocations] = useState(true);
    const [loadingPeriods, setLoadingPeriods] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const [allArchivedGroups, setAllArchivedGroups] = useState([]);
    const [loadingYearRanges, setLoadingYearRanges] = useState(true);
    const [selectedYearRange, setSelectedYearRange] = useState(null);
    const [filteredPeriods, setFilteredPeriods] = useState([]);

    const navigate = useNavigate();

    // Fetch locations + year ranges on mount (in parallel)
    useEffect(() => {
        const abortController = new AbortController();

        axiosInstance
            .get(API_ENDPOINTS.locations, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                signal: abortController.signal
            })
            .then((res) => {
                const formatted = res.data.map((loc) => ({
                    value: loc.id,
                    label: loc.region,
                }));
                setLocations(formatted);
            })
            .catch((err) => {
                if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
                console.error(err);
                setError('Failed to load locations');
            })
            .finally(() => setLoadingLocations(false));

        // Fetch all year ranges upfront (no location filter)
        axiosInstance
            .get(API_ENDPOINTS.payCycleArchived, { signal: abortController.signal })
            .then((res) => {
                const groups = res.data.archivedGroups || [];
                setAllArchivedGroups(groups);
                if (groups.length > 0) {
                    setSelectedYearRange(groups[0].yearRange);
                }
            })
            .catch((err) => {
                if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
                console.error(err);
            })
            .finally(() => setLoadingYearRanges(false));

        return () => abortController.abort();
    }, []);

    // Fetch periods when location or year range changes
    useEffect(() => {
        const abortController = new AbortController();

        if (location && selectedYearRange) {
            setFilteredPeriods([]);
            setLoadingPeriods(true);
            setError(null);

            axiosInstance
                .get(`${API_ENDPOINTS.payCycleArchiveDetail}?location=${location.label}&yearRange=${encodeURIComponent(selectedYearRange)}`, {
                    signal: abortController.signal
                })
                .then((res) => {
                    const data = res.data;
                    if (Array.isArray(data)) {
                        setFilteredPeriods(data);
                    } else if (data?.periods) {
                        setFilteredPeriods(data.periods);
                    } else if (data?.archivedGroups) {
                        const matched = data.archivedGroups.find(g => g.yearRange === selectedYearRange);
                        setFilteredPeriods(matched?.periods || []);
                    } else {
                        setFilteredPeriods([]);
                    }
                })
                .catch((err) => {
                    if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
                    console.error(err);
                    setError('Failed to load archived periods');
                })
                .finally(() => setLoadingPeriods(false));
        } else {
            setFilteredPeriods([]);
        }

        return () => abortController.abort();
    }, [location, selectedYearRange]);

    const handleYearRangeChange = (yearRange) => {
        setSelectedYearRange(yearRange);
    };

    const handleViewClick = (period) => {
        navigate(`/schedules?id=${period.rotaId}`, {
            state: {
                periodId: period.id,
                periodName: period.name,
                location: location.label,
                returnTo: '/paycycleSchedule/archived'
            }
        });
    };

    const handleServiceStatsClick = (period) => {
        navigate(`/servicestats?id=${period.rotaId}`, {
            state: {
                periodId: period.id,
                periodName: period.name,
                location: location.label,
                returnTo: '/paycycleSchedule/archived'
            }
        });
    };

    const handleEmpStatsClick = (period) => {
        navigate(`/empstats?id=${period.rotaId}`, {
            state: {
                periodId: period.id,
                periodName: period.name,
                location: location.label,
                returnTo: '/paycycleSchedule/archived'
            }
        });
    };

    const handleExportStatsClick = async (rotaId) => {
        try {
            setLoading(true);
            const response = await axiosInstance.get(`${API_ENDPOINTS.exportStats}`, {
                params: { id: rotaId },
                responseType: 'blob',
                withCredentials: true,
                headers: {
                    Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            });

            const disposition = response.headers['content-disposition'] || '';
            let filename = `rota-${rotaId}.xlsx`;

            const filenameStarMatch = disposition.match(/filename\*\s*=\s*([^;]+)/i);
            if (filenameStarMatch) {
                try {
                    const value = filenameStarMatch[1].trim().replace(/^UTF-8''/i, '');
                    filename = decodeURIComponent(value.replace(/(^"|"$)/g, ''));
                } catch (e) {
                    filename = filenameStarMatch[1].trim().replace(/(^"|"$)/g, '');
                }
            } else {
                const filenameMatch = disposition.match(/filename\s*=\s*("?)([^";]+)\1/i);
                if (filenameMatch) filename = filenameMatch[2];
            }

            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export download failed', err);
        } finally {
            setLoading(false);
        }
    };

    const yearRangeOptions = allArchivedGroups.map(g => g.yearRange);

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ mb: 2, pt: 8 }}>
                Archived Pay Cycle Periods
            </Typography>

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
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                    <Box sx={{ minWidth: 300, flexGrow: 1 }}>
                        <Autocomplete
                            options={locations}
                            getOptionLabel={(opt) => opt.label || ''}
                            value={location}
                            onChange={(e, val) => {
                                const matched = locations.find(loc => loc.value === val?.value);
                                setLocation(matched || null);
                            }}
                            isOptionEqualToValue={(opt, val) => opt.value === val?.value}
                            renderInput={(params) => (
                                <TextField {...params} label="Location" fullWidth />
                            )}
                        />
                    </Box>

                    <Box sx={{ minWidth: 200 }}>
                        <Autocomplete
                            options={yearRangeOptions}
                            getOptionLabel={(opt) => opt}
                            value={selectedYearRange}
                            onChange={(e, val) => handleYearRangeChange(val)}
                            disableClearable
                            disabled={loadingYearRanges}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Year Range"
                                    fullWidth
                                    placeholder={loadingYearRanges ? 'Loading...' : undefined}
                                />
                            )}
                        />
                    </Box>
                </Box>
            )}

            {loadingPeriods ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {filteredPeriods.map((period, index) => (
                        <Grid item xs={12} sm={6} md={4} key={`${location?.value}-${period.id}`}>
                            <Card variant="outlined">
                                <CardContent sx={{ position: 'relative' }}>
                                    <Typography variant="h6">
                                        {location?.label} | Period {index + 1}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {period.startDate} → {period.endDate}
                                    </Typography>

                                    <Box sx={{ mt: 1 }}>
                                        <Alert
                                            severity={period.hasSolveRequest ? 'success' : 'warning'}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                '& .MuiAlert-icon': { fontSize: '3rem', mr: 2 }
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ flexGrow: 1 }}>
                                                {period.scheduleStatus}
                                            </Typography>

                                            {period.hasSolveRequest && period.solevReqStatus === 'COMPLETED' && (
                                                <Box display="flex" gap={1} flexWrap="wrap">
                                                    <Button
                                                        variant="contained"
                                                        color="primary"
                                                        size="small"
                                                        startIcon={<Home />}
                                                        sx={{ px: 2, py: 0.5 }}
                                                        onClick={() => handleServiceStatsClick(period)}
                                                    >
                                                        Service
                                                    </Button>
                                                    <Button
                                                        variant="contained"
                                                        color="primary"
                                                        size="small"
                                                        startIcon={<People />}
                                                        sx={{ px: 2, py: 0.5 }}
                                                        onClick={() => handleEmpStatsClick(period)}
                                                    >
                                                        Employee
                                                    </Button>
                                                    <Button
                                                        variant="contained"
                                                        color="primary"
                                                        size="small"
                                                        sx={{ px: 2, py: 0.5 }}
                                                        onClick={() => handleViewClick(period)}
                                                    >
                                                        View
                                                    </Button>
                                                    <Button
                                                        variant="contained"
                                                        color="primary"
                                                        size="small"
                                                        startIcon={<FileDownload />}
                                                        sx={{ px: 2, py: 0.5 }}
                                                        onClick={() => handleExportStatsClick(period.rotaId)}
                                                        disabled={loading}
                                                    >
                                                        {loading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                                                        {loading ? 'Downloading...' : 'Export'}
                                                    </Button>
                                                </Box>
                                            )}
                                        </Alert>
                                    </Box>

                                    {period.hasSolveRequest && period.solevReqStatus === 'COMPLETED' && (
                                        <>
                                            <Typography variant="body2" sx={{ mt: 1 }}>
                                                🧑 Employees: {period.employeeCount}
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Typography variant="body2">
                                                    🗓️ Shifts: {period.shiftCount}
                                                </Typography>
                                                <Box sx={{ position: 'relative', flexGrow: 1 }}>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={Math.round((period.shiftAssignmentStats.TotalAssigned / period.shiftCount) * 100)}
                                                        sx={{
                                                            height: 16,
                                                            borderRadius: 8,
                                                            bgcolor: '#eee',
                                                            '& .MuiLinearProgress-bar': {
                                                                backgroundColor:
                                                                    period.shiftAssignmentStats.TotalAssigned / period.shiftCount >= 0.8
                                                                        ? 'success.main'
                                                                        : period.shiftAssignmentStats.TotalAssigned / period.shiftCount >= 0.5
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
                                                            color: period.shiftAssignmentStats.TotalAssigned / period.shiftCount > 0.8 ? 'common.white' : 'text.primary',
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        {Math.round((period.shiftAssignmentStats.TotalAssigned / period.shiftCount) * 100)}%
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            {period.shiftStats &&
                                                Object.entries(period.shiftStats).map(([type, count]) => (
                                                    <Box key={`${location?.value}-${period.id}-${type}`} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Typography variant="body2" sx={{ pl: 2 }}>
                                                            • {type}: {count}
                                                        </Typography>
                                                        <Box sx={{ position: 'relative', width: 180, ml: 'auto' }}>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={Math.round((period.shiftAssignmentStats[type] / count) * 100)}
                                                                sx={{
                                                                    width: '100%',
                                                                    height: 16,
                                                                    borderRadius: 8,
                                                                    bgcolor: '#eee',
                                                                    '& .MuiLinearProgress-bar': {
                                                                        backgroundColor:
                                                                            period.shiftAssignmentStats[type] / count >= 0.8
                                                                                ? 'success.main'
                                                                                : period.shiftAssignmentStats[type] / count >= 0.5
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
                                                                    color: period.shiftAssignmentStats[type] / count > 0.6 ? 'common.white' : 'text.primary',
                                                                    fontWeight: 500,
                                                                }}
                                                            >
                                                                {Math.round((period.shiftAssignmentStats[type] / count) * 100)}%
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                ))}
                                            <Typography variant="body2">
                                                📋 Services: {period.locationCount}
                                            </Typography>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}

                    {location && selectedYearRange && filteredPeriods.length === 0 && !loadingPeriods && (
                        <Grid item xs={12}>
                            <Alert severity="info">No archived periods found for the selected year range.</Alert>
                        </Grid>
                    )}
                </Grid>
            )}
        </Box>
    );
}
