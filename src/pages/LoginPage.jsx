import React, { useState, useEffect } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  Avatar,
  Alert,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import {API_ENDPOINTS} from '../api/endpoint';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: false, password: false, message: null });
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    // Check if redirected due to session expiry
    const sessionExpired = sessionStorage.getItem('sessionExpired');
    if (sessionExpired === 'true') {
      setShowSessionExpired(true);
      sessionStorage.removeItem('sessionExpired');
      
      // Auto-hide message after 5 seconds
      setTimeout(() => setShowSessionExpired(false), 5000);
    }

    // If already authenticated, redirect
    if (isAuthenticated) {
      navigate('/paycycleSchedule');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async () => {
    let newErrors = { email: false, password: false, message: null };
    if (!email) newErrors.email = true;
    if (!password) newErrors.password = true;
    setErrors(newErrors);

    if (!newErrors.email && !newErrors.password) {
      try {
        const response = await axios.post(API_ENDPOINTS.login, { "userName": email, "pass": password });
        const token = response.data.token;
        login(token); // This will handle navigation and state restoration
        setErrors({ email: false, password: false, message: null });
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

        {showSessionExpired && (
          <Alert severity="warning" sx={{ width: '100%', mt: 2 }} onClose={() => setShowSessionExpired(false)}>
            Your session has expired. Please log in again.
          </Alert>
        )}

        {errors.message && (
          <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
            {errors.message}
          </Alert>
        )}

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
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
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
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
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
