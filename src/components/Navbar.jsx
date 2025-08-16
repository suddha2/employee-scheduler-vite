import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';


function isTokenValid() {
  var token = localStorage.getItem("token");
  return typeof token === 'string' && token.trim() !== '';
}
function setToken(){
  localStorage.setItem("token",'');
}
function Navbar()   {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Employee Scheduler
        </Typography>
        {/* <Button color="inherit" component={Link} to="/submit">Smart Schedule</Button>
        <Button color="inherit" component={Link} to="/schedules">View Schedules</Button>
        <Button color="inherit" component={Link} to="/login">Logout</Button> */}

       {isTokenValid() && (
  <>
    <Button color="inherit" component={Link} to="/submit">
      Smart Schedule
    </Button>
    <Button color="inherit" component={Link} to="/schedules">
      View Schedules
    </Button>
    <Button
      color="inherit"
      component={Link}
      to="/login"
      onClick={() => setToken()}
    >
      Logout
    </Button>
  </>
)}
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
