import React, { useState,useEffect } from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';


function isTokenValid() {
  var token = localStorage.getItem("token");
  return typeof token === 'string' && token.trim() !== '';
}

function Navbar()   {

  const [token, setToken] = useState(null);
useEffect(() => {
  if (localStorage.getItem("token")) {
   setToken(localStorage.getItem("token"));
  }
});

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
    {/* <Button color="inherit" component={Link} to="/submit">
      Smart Schedule
    </Button>
    <Button color="inherit" component={Link} to="/schedules">
      View Schedules
    </Button> */}
    <Button
      color="inherit"
      component={Link}
      to="/login"
      onClick={() => { setToken(""); localStorage.setItem("token","");}}
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
