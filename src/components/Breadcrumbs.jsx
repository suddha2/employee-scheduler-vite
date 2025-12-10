import { Box, Breadcrumbs as MuiBreadcrumbs, Link, Typography, IconButton } from '@mui/material';
import { NavigateNext, Menu as MenuIcon } from '@mui/icons-material';
import { useLocation, Link as RouterLink } from 'react-router-dom';

export default function Breadcrumbs({ onMenuClick, sidebarOpen }) {
    const location = useLocation();

    // Route to breadcrumb mapping
    const routeMap = {
        '/dashboard': { label: 'Home', parent: null },
        '/employees': { label: 'Employees', parent: '/dashboard' },
        '/employees/create': { label: 'Create Employee', parent: '/employees' },
        '/employees/edit': { label: 'Edit Employee', parent: '/employees' },
        '/paycycleSchedule': { label: 'Pay Cycle Schedule', parent: '/dashboard' },
        '/schedules': { label: 'View Schedules', parent: '/dashboard' },
        '/servicestats': { label: 'Service Statistics', parent: '/dashboard' },
        '/empstats': { label: 'Employee Statistics', parent: '/dashboard' },
        '/submit': { label: 'Submit Schedule', parent: '/dashboard' }
    };

    // Build breadcrumb trail
    const buildBreadcrumbs = () => {
        const pathSegments = location.pathname.split('/').filter(Boolean);
        const breadcrumbs = [];

        // Always start with Home
        breadcrumbs.push({
            label: 'Home',
            path: '/dashboard'
        });

        // Build path progressively
        let currentPath = '';
        pathSegments.forEach((segment, index) => {
            currentPath += `/${segment}`;
            
            // Check if this is a known route
            const route = routeMap[currentPath];
            if (route) {
                breadcrumbs.push({
                    label: route.label,
                    path: currentPath
                });
            } else if (index === pathSegments.length - 1) {
                // Last segment - might be an ID or dynamic segment
                // Check if parent path exists
                const parentPath = '/' + pathSegments.slice(0, -1).join('/');
                if (routeMap[parentPath]) {
                    breadcrumbs.push({
                        label: segment.charAt(0).toUpperCase() + segment.slice(1),
                        path: currentPath
                    });
                }
            }
        });

        return breadcrumbs;
    };

    const breadcrumbs = buildBreadcrumbs();
    const isLastBreadcrumb = (index) => index === breadcrumbs.length - 1;

    // Don't show breadcrumbs on login page
    if (location.pathname === '/login' || location.pathname === '/') {
        return null;
    }

    return (
        <Box
            sx={{
                px: 3,
                py: 2,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                gap: 2
            }}
        >
            {/* Menu Button (Mobile) */}
            {!sidebarOpen && (
                <IconButton
                    edge="start"
                    color="inherit"
                    aria-label="menu"
                    onClick={onMenuClick}
                    sx={{ mr: 1 }}
                >
                    <MenuIcon />
                </IconButton>
            )}

            {/* Breadcrumbs */}
            <MuiBreadcrumbs
                separator={<NavigateNext fontSize="small" />}
                aria-label="breadcrumb"
            >
                {breadcrumbs.map((crumb, index) => {
                    const isLast = isLastBreadcrumb(index);
                    
                    return isLast ? (
                        <Typography key={crumb.path} color="text.primary" fontWeight="medium">
                            {crumb.label}
                        </Typography>
                    ) : (
                        <Link
                            key={crumb.path}
                            component={RouterLink}
                            to={crumb.path}
                            underline="hover"
                            color="inherit"
                            sx={{
                                '&:hover': {
                                    color: 'primary.main'
                                }
                            }}
                        >
                            {crumb.label}
                        </Link>
                    );
                })}
            </MuiBreadcrumbs>
        </Box>
    );
}
