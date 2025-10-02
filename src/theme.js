import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4B70DD', // Modernize Blue
      contrastText: '#fff',
    },
    secondary: {
      main: '#f50057', // Optional accent color
    },
    background: {
      default: '#f4f6f8', // Main content background
      paper: '#fff',       // Topbar/Drawer paper
    },
    text: {
      primary: '#333',
      secondary: '#6c757d',
    },
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          width: 220,
          backgroundColor: '#fff', // Light sidebar
          borderRight: '1px solid #e0e0e0',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          margin: '4px 8px',
          '&.Mui-selected': {
            backgroundColor: '#e9f5ff',
            color: '#4B70DD',
            '& .MuiListItemIcon-root': {
              color: '#4B70DD',
            },
          },
          '&:hover': {
            backgroundColor: '#f2f8ff',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 4px rgba(0,0,0,0.08)', // subtle elevation
          backgroundColor: '#fff',
          color: '#333',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 64,
          paddingLeft: 24,
          paddingRight: 24,
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        h6: {
          fontWeight: 600,
        },
      },
    },
  },
});

export default theme;
