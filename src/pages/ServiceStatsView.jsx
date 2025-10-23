import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    CircularProgress,
    Alert,
    LinearProgress,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useEffect, useState } from 'react';
import axiosInstance from '../components/axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';

export default function ServiceStatsView() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const rotaId = new URLSearchParams(window.location.search).get('id');
        axiosInstance
            .get(`${API_ENDPOINTS.serviceStats}?id=${rotaId}`)
            .then((res) => setData(res.data))
            .catch((err) => {
                console.error(err);
                setError('Failed to load service stats');
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <Box sx={{ pt: 10, px: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {data.flatMap(region =>
                        region.services.map((service, index) => {
                            const allStats = service.weeks?.flatMap(w => w.shiftStats ?? []) ?? [];
                            const totalsByType = Array.from(
                                allStats.reduce((acc, stat) => {
                                    const key = stat.shiftType;
                                    const existing = acc.get(key) || {
                                        shiftType: key,
                                        totalHours: 0,
                                        allocatedHours: 0,
                                        unallocatedHours: 0,
                                        shiftCount: 0,
                                        allocationCount: 0,
                                    };
                                    existing.totalHours += stat.totalHours;
                                    existing.allocatedHours += stat.allocatedHours;
                                    existing.unallocatedHours += stat.unallocatedHours;
                                    existing.shiftCount += stat.shiftCount;
                                    existing.allocationCount += stat.allocationCount;
                                    acc.set(key, existing);
                                    return acc;
                                }, new Map()).values()
                            );

                            return (
                                <Grid item xs={12} sm={6} md={4} key={`${region.region}-${service.location}-${index}`}>
                                    <Card
                                        variant="outlined"
                                        sx={{
                                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                            '&:hover': { transform: 'scale(1.01)', boxShadow: 4 },
                                            borderLeft: '6px solid',
                                            borderColor: totalsByType.some(s => s.unallocatedHours > 0) ? 'error.main' : 'success.main',
                                        }}
                                    >
                                        <CardContent>
                                            {/* Coverage Calculation */}
                                            {(() => {
                                                const allStats = service.weeks?.flatMap(w => w.shiftStats ?? []) ?? [];
                                                const totalShifts = allStats.reduce((sum, s) => sum + s.shiftCount, 0);
                                                const allocatedShifts = allStats.reduce((sum, s) => sum + s.allocationCount, 0);
                                                const coverage = totalShifts > 0 ? Math.round((allocatedShifts / totalShifts) * 100) : 0;

                                                const headerBg =
                                                    coverage >= 80 ? 'green.50' :
                                                        coverage >= 50 ? 'amber.50' :
                                                            'red.50';

                                                return (
                                                    <>
                                                        {/* Header Band */}
                                                        <Box
                                                            sx={{
                                                                bgcolor: headerBg,
                                                                px: 2,
                                                                py: 1.5,
                                                                borderRadius: 1,
                                                                mb: 2,
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: 0.5,
                                                            }}
                                                        >
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <Typography variant="h6">{service.location}</Typography>
                                                                <Chip
                                                                    label={`Coverage: ${coverage}%`}
                                                                    color={
                                                                        coverage >= 80 ? 'success' :
                                                                            coverage >= 50 ? 'warning' :
                                                                                'error'
                                                                    }
                                                                    size="small"
                                                                />
                                                            </Box>
                                                            <Typography variant="body2" color="text.secondary">
                                                                Region: {region.region} | Period: {region.period}
                                                            </Typography>
                                                        </Box>

                                                        {/* Summary Bar */}
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                                            <Typography variant="body2">📋 Total Shifts: {totalShifts}</Typography>
                                                            <Typography variant="body2">✅ Allocated: {allocatedShifts}</Typography>
                                                            <Typography variant="body2">❌ Unallocated: {totalShifts - allocatedShifts}</Typography>
                                                        </Box>
                                                    </>
                                                );
                                            })()}

                                            {/* Grand Total Table */}
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="subtitle2">Grand Total (4 Weeks)</Typography>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell>Shift Type</TableCell>
                                                            <TableCell>Alloc Count</TableCell>
                                                            <TableCell>Unalloc Count</TableCell>
                                                            <TableCell>Shift Count</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {totalsByType.map((stat, i) => (
                                                            <TableRow key={i}>
                                                                <TableCell>{stat.shiftType}</TableCell>
                                                                <TableCell>{stat.allocationCount}</TableCell>
                                                                <TableCell>{stat.shiftCount - stat.allocationCount}</TableCell>
                                                                <TableCell>{stat.shiftCount}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </Box>

                                            {/* Weekly Breakdown with Accordion */}
                                            {service.weeks?.map((week, i) => (
                                                <Accordion key={i} sx={{ mb: 2 }}>
                                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                        <Typography variant="subtitle2">
                                                            Week {week.weekNumber} ({week.start} → {week.end})
                                                        </Typography>
                                                    </AccordionSummary>
                                                    <AccordionDetails>
                                                        <Table size="small">
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell>Shift Type</TableCell>
                                                                    <TableCell>Alloc Count</TableCell>
                                                                    <TableCell>Unalloc Count</TableCell>
                                                                    <TableCell>Shift Count</TableCell>
                                                                    <TableCell>Coverage</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {week.shiftStats?.map((stat, j) => {
                                                                    const percent = stat.shiftCount > 0 ? Math.round((stat.allocationCount / stat.shiftCount) * 100) : 0;
                                                                    return (
                                                                        <TableRow key={j}>
                                                                            <TableCell>{stat.shiftType}</TableCell>
                                                                            <TableCell>{stat.allocationCount}</TableCell>
                                                                            <TableCell>{stat.shiftCount - stat.allocationCount}</TableCell>
                                                                            <TableCell>{stat.shiftCount}</TableCell>
                                                                            <TableCell sx={{ minWidth: 140 }}>
                                                                                <Box sx={{ position: 'relative', width: '100%', maxWidth: 120 }}>
                                                                                    <LinearProgress
                                                                                        variant="determinate"
                                                                                        value={percent}
                                                                                        sx={{
                                                                                            height: 10,
                                                                                            borderRadius: 5,
                                                                                            bgcolor: '#eee',
                                                                                            '& .MuiLinearProgress-bar': {
                                                                                                backgroundColor:
                                                                                                    percent >= 80 ? 'success.main' :
                                                                                                        percent >= 50 ? 'warning.main' :
                                                                                                            'error.main',
                                                                                            },
                                                                                        }}
                                                                                    />
                                                                                    <Typography
                                                                                        variant="caption"
                                                                                        sx={{
                                                                                            position: 'absolute',
                                                                                            top: 0,
                                                                                            left: 0,
                                                                                            width: '100%',
                                                                                            height: '100%',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            justifyContent: 'center',
                                                                                            textAlign: 'center',
                                                                                            fontWeight: 500,
                                                                                            fontSize: '0.75rem',
                                                                                        }}
                                                                                    >
                                                                                        {percent}%
                                                                                    </Typography>
                                                                                </Box>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    );
                                                                })}
                                                            </TableBody>
                                                        </Table>
                                                    </AccordionDetails>
                                                </Accordion>
                                            ))}
                                        </CardContent>
                                    </Card>

                                </Grid>
                            );
                        })
                    )}
                </Grid>
            )}
        </Box>
    );
}
