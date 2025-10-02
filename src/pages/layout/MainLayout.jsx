import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Badge,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

const drawerWidth = 240;

export default function MainLayout({ children }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#fff' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: '#fff',
            borderRight: '1px solid #edf2f6',
          },
        }}
      >
        {/* Logo section */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 64,
            px: 2,
            //borderBottom: '1px solid #edf2f6',
          }}
        >
          <img
            src="/logo192.png" // replace with your logo path
            alt="Logo"
            style={{ height: 32 }}
          />
        </Box>

        {/* Nav items */}
        <List sx={{ mt: 1 }}>
          <ListItemButton
            selected
            sx={{
              borderRadius: 2,
              mx: 1,
              mb: 0.5,
              '&.Mui-selected': {
                bgcolor: 'rgba(93,135,255,0.12)',
                '& .MuiListItemIcon-root': { color: '#5D87FF' },
                '& .MuiTypography-root': { fontWeight: 600 },
              },
            }}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
          <ListItemButton sx={{ mx: 1, borderRadius: 2, mb: 0.5 }}>
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText primary="Employees" />
          </ListItemButton>
          <ListItemButton sx={{ mx: 1, borderRadius: 2 }}>
            <ListItemIcon>
              <CalendarMonthIcon />
            </ListItemIcon>
            <ListItemText primary="Shifts" />
          </ListItemButton>
        </List>
      </Drawer>

      {/* Main area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <AppBar
          position="fixed"
          sx={{
            bgcolor: '#fff',
            color: '#2A3547',
            boxShadow: 'none',
            ml: `${drawerWidth}px`,
            width: `calc(100% - ${drawerWidth}px)`,
          }}
        >
          <Toolbar sx={{ minHeight: 64, display: 'flex', justifyContent: 'flex-end' }}>
            {/* <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
              Dashboard
            </Typography> */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton>
                <Badge badgeContent={4} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
              <IconButton>
                <Avatar src="https://i.pravatar.cc/40" />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            mt: '64px',
            bgcolor: '#fff',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
