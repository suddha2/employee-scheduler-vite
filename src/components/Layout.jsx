import { useState } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import Sidebar, { DRAWER_WIDTH } from './Sidebar';
import Breadcrumbs from './Breadcrumbs';

/**
 * Layout component that wraps all authenticated pages
 * Provides consistent structure with sidebar and breadcrumbs
 */
export default function Layout({ children }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

    const handleSidebarToggle = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const handleSidebarClose = () => {
        setSidebarOpen(false);
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <Sidebar
                open={sidebarOpen}
                onClose={handleSidebarClose}
                onToggle={handleSidebarToggle}
            />

            {/* Main Content Area */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    mt: 8, // Account for AppBar height
                    transition: theme.transitions.create(['margin', 'width'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen
                    }),
                    ...(sidebarOpen && !isMobile && {
                        width: `calc(100% - ${DRAWER_WIDTH}px)`,
                        ml: '10px',
                        transition: theme.transitions.create(['margin', 'width'], {
                            easing: theme.transitions.easing.easeOut,
                            duration: theme.transitions.duration.enteringScreen
                        })
                    })
                }}
            >
                {/* Breadcrumbs */}
                <Breadcrumbs onMenuClick={handleSidebarToggle} sidebarOpen={sidebarOpen} />

                {/* Page Content */}
                <Box sx={{ minHeight: 'calc(100vh - 120px)' }}>
                    {children}
                </Box>
            </Box>
        </Box>
    );
}
