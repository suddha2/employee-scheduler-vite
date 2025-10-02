import React, { useState } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  Avatar,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import {API_ENDPOINTS} from '../api/endpoint';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';


function onLogin(token){
  localStorage.setItem("token",token);
}

function LoginPage_old() {
  
  localStorage.setItem("token",'');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errors, setErrors] = useState({ email: false, password: false,message: null });
  const navigate = useNavigate();
  const handleLogin = async () => {
    let newErrors = { email: false, password: false };
    if (!email) newErrors.email = true;
    if (!password) newErrors.password = true;
    setErrors(newErrors);

    if (!newErrors.email && !newErrors.password) {
      try {
      const response = await axios.post(API_ENDPOINTS.login, { "userName": email, "pass":password });
      const token = response.data.token;
      onLogin(token);
      //navigate('/submit');
      navigate('/paycycleSchedule');
      setErrors('');
      } catch (err) {
        console.error('Login failed:', err);
        setErrors({ ...newErrors, message: 'Invalid credentials or server error' });
    
      }
    }
  };


  return (
    <Container maxWidth="xs">
      <Paper
        elevation={6}
        sx={{ mt: 12, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5" gutterBottom>
          Employee Scheduler Login
        </Typography>

        <Box component="form" sx={{ mt: 1, width: '100%' }} noValidate>
          <TextField
            label="Email Address"
            margin="normal"
            required
            fullWidth
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            helperText={errors.email ? 'Email is required' : ''}
          />
          <TextField
            label="Password"
            margin="normal"
            required
            fullWidth
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            helperText={errors.password ? 'Password is required' : ''}
          />
          <Button
            type="button"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            onClick={handleLogin}
          >
            Sign In
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default LoginPage_old;
