import { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    CardActionArea,
    Typography,
    Paper,
    Avatar,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    People as PeopleIcon,
    CalendarMonth as CalendarIcon,
    Schedule as ScheduleIcon,
    Assessment as AssessmentIcon,
    TrendingUp as TrendingUpIcon,
    EventAvailable as EventAvailableIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../components/axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalEmployees: 0,
        activeSchedules: 0,
        pendingRequests: 0,
        completedThisWeek: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch dashboard statistics
    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        setLoading(true);
        try {
            // You can create a dedicated dashboard stats endpoint
            // For now, we'll use placeholder values
            // Replace with actual API calls
            
            // Example: const employeeCount = await axiosInstance.get(API_ENDPOINTS.employeeCount);
            
            setStats({
                totalEmployees: 55, // Replace with actual API call
                activeSchedules: 12,
                pendingRequests: 3,
                completedThisWeek: 8
            });
        } catch (err) {
            console.error('Failed to fetch dashboard stats:', err);
            setError('Failed to load dashboard statistics');
        } finally {
            setLoading(false);
        }
    };

    // Navigation cards configuration
    const navigationCards = [
        {
            title: 'Employee Management',
            description: 'View, create, and manage employee records',
            icon: <PeopleIcon sx={{ fontSize: 48 }} />,
            color: '#1976d2',
            path: '/employees',
            stat: stats.totalEmployees,
            statLabel: 'Total Employees'
        },
        {
            title: 'Pay Cycle Schedule',
            description: 'Manage 4-week pay cycle periods and generate schedules',
            icon: <CalendarIcon sx={{ fontSize: 48 }} />,
            color: '#2e7d32',
            path: '/paycycleSchedule',
            stat: stats.activeSchedules,
            statLabel: 'Active Periods'
        },
        {
            title: 'View Schedules',
            description: 'View and edit generated shift schedules',
            icon: <ScheduleIcon sx={{ fontSize: 48 }} />,
            color: '#ed6c02',
            path: '/schedules',
            stat: stats.completedThisWeek,
            statLabel: 'This Week'
        },
        {
            title: 'Service Statistics',
            description: 'View location-based service statistics',
            icon: <AssessmentIcon sx={{ fontSize: 48 }} />,
            color: '#9c27b0',
            path: '/servicestats',
            stat: null,
            statLabel: 'Reports'
        },
        {
            title: 'Employee Statistics',
            description: 'View employee performance and allocation stats',
            icon: <TrendingUpIcon sx={{ fontSize: 48 }} />,
            color: '#0288d1',
            path: '/empstats',
            stat: null,
            statLabel: 'Analytics'
        },
        {
            title: 'Submit Schedule',
            description: 'Submit and manage schedule requests',
            icon: <EventAvailableIcon sx={{ fontSize: 48 }} />,
            color: '#d32f2f',
            path: '/submit',
            stat: stats.pendingRequests,
            statLabel: 'Pending'
        }
    ];

    const handleCardClick = (path) => {
        navigate(path);
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Welcome Section */}
            <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: 'primary.main', color: 'white' }}>
                <Typography variant="h4" gutterBottom>
                    Welcome to Employee Scheduler
                </Typography>
                <Typography variant="body1">
                    Manage your workforce efficiently with AI-powered scheduling
                </Typography>
            </Paper>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Loading State */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {/* Quick Stats Overview */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={2}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box>
                                            <Typography color="textSecondary" gutterBottom variant="body2">
                                                Total Employees
                                            </Typography>
                                            <Typography variant="h4" component="div">
                                                {stats.totalEmployees}
                                            </Typography>
                                        </Box>
                                        <Avatar sx={{ bgcolor: '#1976d2', width: 56, height: 56 }}>
                                            <PeopleIcon />
                                        </Avatar>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={2}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box>
                                            <Typography color="textSecondary" gutterBottom variant="body2">
                                                Active Schedules
                                            </Typography>
                                            <Typography variant="h4" component="div">
                                                {stats.activeSchedules}
                                            </Typography>
                                        </Box>
                                        <Avatar sx={{ bgcolor: '#2e7d32', width: 56, height: 56 }}>
                                            <CalendarIcon />
                                        </Avatar>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={2}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box>
                                            <Typography color="textSecondary" gutterBottom variant="body2">
                                                Pending Requests
                                            </Typography>
                                            <Typography variant="h4" component="div">
                                                {stats.pendingRequests}
                                            </Typography>
                                        </Box>
                                        <Avatar sx={{ bgcolor: '#d32f2f', width: 56, height: 56 }}>
                                            <EventAvailableIcon />
                                        </Avatar>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={2}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box>
                                            <Typography color="textSecondary" gutterBottom variant="body2">
                                                Completed This Week
                                            </Typography>
                                            <Typography variant="h4" component="div">
                                                {stats.completedThisWeek}
                                            </Typography>
                                        </Box>
                                        <Avatar sx={{ bgcolor: '#ed6c02', width: 56, height: 56 }}>
                                            <ScheduleIcon />
                                        </Avatar>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Navigation Cards */}
                    <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                        Quick Access
                    </Typography>
                    
                    <Grid container spacing={3}>
                        {navigationCards.map((card) => (
                            <Grid item xs={12} sm={6} md={4} key={card.path}>
                                <Card 
                                    elevation={3}
                                    sx={{
                                        height: '100%',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 6,
                                        }
                                    }}
                                >
                                    <CardActionArea 
                                        onClick={() => handleCardClick(card.path)}
                                        sx={{ height: '100%', p: 2 }}
                                    >
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                                <Avatar
                                                    sx={{
                                                        bgcolor: card.color,
                                                        width: 64,
                                                        height: 64,
                                                        mr: 2
                                                    }}
                                                >
                                                    {card.icon}
                                                </Avatar>
                                                <Box sx={{ flexGrow: 1 }}>
                                                    <Typography variant="h6" component="div">
                                                        {card.title}
                                                    </Typography>
                                                    {card.stat !== null && (
                                                        <Typography variant="h5" color="primary">
                                                            {card.stat}
                                                        </Typography>
                                                    )}
                                                    <Typography variant="caption" color="textSecondary">
                                                        {card.statLabel}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Typography variant="body2" color="textSecondary">
                                                {card.description}
                                            </Typography>
                                        </CardContent>
                                    </CardActionArea>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Recent Activity Section (Optional - for future) */}
                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h5" gutterBottom>
                            Recent Activity
                        </Typography>
                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                            <Typography color="textSecondary">
                                No recent activity to display
                            </Typography>
                        </Paper>
                    </Box>
                </>
            )}
        </Box>
    );
}
