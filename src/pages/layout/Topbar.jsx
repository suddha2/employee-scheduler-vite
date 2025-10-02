import { AppBar, Toolbar, Typography, Box, IconButton, Badge, Avatar, InputBase } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SearchIcon from '@mui/icons-material/Search';

export default function Topbar() {
  return (
    <AppBar position="fixed" elevation={4}>
      <Toolbar>
        <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
          My App
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.15)', px: 1.5, borderRadius: 1 }}>
            <SearchIcon />
            <InputBase placeholder="Search..." sx={{ ml: 1, color: '#fff' }} />
          </Box>

          <IconButton color="inherit">
            <Badge badgeContent={4} color="secondary">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton color="inherit">
            <Avatar src="https://i.pravatar.cc/300" />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
