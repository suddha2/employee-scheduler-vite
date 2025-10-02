// src/pages/authentication/ForgotPassword.jsx
import React, { useState } from 'react';
import { Box, Container, Paper, Typography, TextField, Button, Alert, Link } from '@mui/material';
import MinimalLayout from '../../pages/layout/MinimalLayout';
import axios from 'axios';
import {API_ENDPOINTS} from '../../api/endpoint.js'; // your API endpoints file

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!email) {
      setError('Email is required');
      return;
    }

    try {
      // Call your backend API to send reset link
      await axios.post(API_ENDPOINTS.forgotPassword, { email });
      setMessage('Password reset link sent to your email.');
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Failed to send reset link. Please try again.');
    }
  };

  return (
    <MinimalLayout>
      <Container maxWidth="xs">
        <Paper
          elevation={6}
          sx={{ mt: 12, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 3 }}
        >
          <Typography component="h1" variant="h5" gutterBottom>
            Forgot Password
          </Typography>

          {message && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}

          <Box component="form" sx={{ mt: 1, width: '100%' }} onSubmit={handleSubmit}>
            <TextField
              label="Email Address"
              margin="normal"
              required
              fullWidth
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
              Send Reset Link
            </Button>

            <Box textAlign="center">
              <Link href="/login" variant="body2">
                Back to Login
              </Link>
            </Box>
          </Box>
        </Paper>
      </Container>
    </MinimalLayout>
  );
}
