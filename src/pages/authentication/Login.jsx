import React, { useState } from 'react';
import { Avatar, Typography, TextField, Button, Alert, Link, Paper, Box } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '../../api/endpoint.js'; // your API endpoints file

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: false, password: false, message: null });

  localStorage.setItem('token', '');

  const handleLogin = async () => {
    const newErrors = { email: false, password: false };
    if (!email) newErrors.email = true;
    if (!password) newErrors.password = true;
    setErrors({ ...newErrors, message: null });

    if (!newErrors.email && !newErrors.password) {
      try {
        const response = await axios.post(API_ENDPOINTS.login, { userName: email, pass: password });
        const token = response.data.token;
        localStorage.setItem('token', token);
        navigate('/dashboard');
      } catch (err) {
        setErrors({ ...newErrors, message: 'Invalid credentials or server error' });
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f4f6f8',
        px: 2,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: { xs: 4, sm: 6, md: 8 },
          borderRadius: 4,
          width: '100%',
          maxWidth: { xs: '90%', sm: 450, md: 500, lg: 550 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar sx={{ m: 2, bgcolor: 'primary.main', width: 64, height: 64 }}>
          <LockOutlinedIcon fontSize="large" />
        </Avatar>

        <Typography component="h1" variant="h4" gutterBottom sx={{ mt: 1, fontWeight: 600 }}>
          Midco Internal Assistant 
        </Typography>
        <Typography variant="subtitle1" gutterBottom sx={{ mb: 3 }}>
          Sign in to your account
        </Typography>

        {/* Reserved space for Alert */}
        <Box sx={{ width: '100%', mb: 2, minHeight: '56px' }}>
          {errors.message && <Alert severity="error">{errors.message}</Alert>}
        </Box>

        {/* Email */}
        <TextField
          label="Email Address"
          margin="normal"
          required
          fullWidth
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          helperText={errors.email ? 'Email is required' : ' '}
          sx={{ mt: 1 }}
        />

        {/* Password */}
        <TextField
          label="Password"
          margin="normal"
          required
          fullWidth
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          helperText={errors.password ? 'Password is required' : ' '}
          sx={{ mt: 1 }}
        />

        <Button
          type="button"
          fullWidth
          variant="contained"
          sx={{ mt: 4, mb: 2, py: 1.8 }}
          onClick={handleLogin}
        >
          Sign In
        </Button>

        <Link href="/forgot-password" variant="body2" sx={{ mt: 1 }}>
          Forgot Password?
        </Link>
      </Paper>
    </Box>
  );
}
