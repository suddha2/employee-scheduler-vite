import { useState } from 'react';
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    Typography,
    IconButton,
    useTheme,
    useMediaQuery,
    Collapse
} from '@mui/material';
import {
    Home as HomeIcon,
    People as PeopleIcon,
    CalendarMonth as CalendarIcon,
    Schedule as ScheduleIcon,
    Assessment as AssessmentIcon,
    ExpandLess,
    ExpandMore,
    ChevronLeft as ChevronLeftIcon,
    Menu as MenuIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const DRAWER_WIDTH = 260;

export default function Sidebar({ open, onClose, onToggle }) {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [statsOpen, setStatsOpen] = useState(false);

    const handleStatsClick = () => {
        setStatsOpen(!statsOpen);
    };

    const menuItems = [
        {
            title: 'Home',
            icon: <HomeIcon />,
            path: '/dashboard',
            divider: true
        },
        {
            title: 'Employees',
            icon: <PeopleIcon />,
            path: '/employees'
        },
        {
            title: 'Pay Cycle Schedule',
            icon: <CalendarIcon />,
            path: '/paycycleSchedule'
        },
        // {
        //     title: 'View Schedules',
        //     icon: <ScheduleIcon />,
        //     path: '/schedules',
        //     divider: true
        // },
        // {
        //     title: 'Statistics',
        //     icon: <AssessmentIcon />,
        //     isExpandable: true,
        //     children: [
        //         {
        //             title: 'Service Stats',
        //             path: '/servicestats'
        //         },
        //         {
        //             title: 'Employee Stats',
        //             path: '/empstats'
        //         }
        //     ]
        // }
    ];

    const handleNavigate = (path) => {
        navigate(path);
        if (isMobile) {
            onClose();
        }
    };

    const isActive = (path) => {
        return location.pathname === path;
    };

    const drawerContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Sidebar Header */}
            <Box
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: 'primary.main',
                    color: 'white'
                }}
            >
                <Typography variant="h6" noWrap>
                    Scheduler
                </Typography>
                {!isMobile && (
                    <IconButton onClick={onToggle} sx={{ color: 'white' }}>
                        <ChevronLeftIcon />
                    </IconButton>
                )}
            </Box>

            <Divider />

            {/* Navigation Menu */}
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                <List>
                    {menuItems.map((item, index) => (
                        <div key={item.title}>
                            {item.isExpandable ? (
                                <>
                                    <ListItemButton onClick={handleStatsClick}>
                                        <ListItemIcon
                                            sx={{
                                                color: statsOpen ? 'primary.main' : 'inherit'
                                            }}
                                        >
                                            {item.icon}
                                        </ListItemIcon>
                                        <ListItemText primary={item.title} />
                                        {statsOpen ? <ExpandLess /> : <ExpandMore />}
                                    </ListItemButton>
                                    <Collapse in={statsOpen} timeout="auto" unmountOnExit>
                                        <List component="div" disablePadding>
                                            {item.children.map((child) => (
                                                <ListItemButton
                                                    key={child.path}
                                                    sx={{
                                                        pl: 4,
                                                        bgcolor: isActive(child.path)
                                                            ? 'action.selected'
                                                            : 'transparent',
                                                        '&:hover': {
                                                            bgcolor: isActive(child.path)
                                                                ? 'action.selected'
                                                                : 'action.hover'
                                                        }
                                                    }}
                                                    onClick={() => handleNavigate(child.path)}
                                                >
                                                    <ListItemText primary={child.title} />
                                                </ListItemButton>
                                            ))}
                                        </List>
                                    </Collapse>
                                </>
                            ) : (
                                <ListItemButton
                                    onClick={() => handleNavigate(item.path)}
                                    sx={{
                                        bgcolor: isActive(item.path)
                                            ? 'action.selected'
                                            : 'transparent',
                                        '&:hover': {
                                            bgcolor: isActive(item.path)
                                                ? 'action.selected'
                                                : 'action.hover'
                                        }
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            color: isActive(item.path) ? 'primary.main' : 'inherit'
                                        }}
                                    >
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText primary={item.title} />
                                </ListItemButton>
                            )}
                            {item.divider && <Divider sx={{ my: 1 }} />}
                        </div>
                    ))}
                </List>
            </Box>

            {/* Sidebar Footer */}
            <Divider />
            <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="textSecondary">
                    Employee Scheduler v2.0
                </Typography>
            </Box>
        </Box>
    );

    return (
        <>
            {/* Mobile: Temporary drawer */}
            {isMobile ? (
                <Drawer
                    variant="temporary"
                    open={open}
                    onClose={onClose}
                    ModalProps={{
                        keepMounted: true // Better mobile performance
                    }}
                    sx={{
                        '& .MuiDrawer-paper': {
                            width: DRAWER_WIDTH,
                            boxSizing: 'border-box'
                        }
                    }}
                >
                    {drawerContent}
                </Drawer>
            ) : (
                /* Desktop: Persistent drawer */
                <Drawer
                    variant="persistent"
                    open={open}
                    sx={{
                        width: open ? DRAWER_WIDTH : 0,
                        flexShrink: 0,
                        '& .MuiDrawer-paper': {
                            width: DRAWER_WIDTH,
                            boxSizing: 'border-box',
                            top: 64, // Height of AppBar
                            height: 'calc(100% - 64px)'
                        }
                    }}
                >
                    {drawerContent}
                </Drawer>
            )}
        </>
    );
}

// Export drawer width for layout calculations
export { DRAWER_WIDTH };
