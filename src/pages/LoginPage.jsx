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
  Divider,
  CircularProgress,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import {API_ENDPOINTS} from '../api/endpoint';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loginWithMicrosoft, msalConfigured } from '../auth/msalConfig';

// The little Microsoft 4-square logo, inlined so we don't pull a logo asset
// in. Renders at the size of the button's startIcon slot.
const MicrosoftLogo = () => (
  <Box component="svg" viewBox="0 0 21 21" sx={{ width: 18, height: 18 }} aria-hidden>
    <rect x="1"  y="1"  width="9" height="9" fill="#F25022" />
    <rect x="11" y="1"  width="9" height="9" fill="#7FBA00" />
    <rect x="1"  y="11" width="9" height="9" fill="#00A4EF" />
    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
  </Box>
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: false, password: false, message: null });
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const [msLoading, setMsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, msSignInInProgress } = useAuth();

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
        const status = err.response?.status;
        const serverMessage = err.response?.data?.message;
        let message;
        if (status === 401 && serverMessage && /inactive/i.test(serverMessage)) {
          // Backend rejects soft-deleted users with this message.
          message = 'Your account is inactive. Please contact an administrator.';
        } else if (status === 401) {
          message = 'Invalid username or password.';
        } else {
          message = serverMessage || 'Login failed — please try again.';
        }
        setErrors({ ...newErrors, message });
      }
    }
  };

  const handleMicrosoftLogin = async () => {
    setErrors({ email: false, password: false, message: null });
    setMsLoading(true);
    try {
      // Triggers a full-page redirect to Microsoft. After auth, the user
      // lands at /auth/microsoft/callback which exchanges the ID token
      // for a PASETO and finishes the sign-in. This function never resolves
      // on the success path — the page has navigated away.
      await loginWithMicrosoft();
    } catch (err) {
      // Only fires if MSAL itself errors BEFORE the redirect (not configured,
      // init failed, etc.). Network/server errors happen on the callback page.
      console.error('Microsoft sign-in failed before redirect:', err);
      setMsLoading(false);
      setErrors({
        email: false,
        password: false,
        message: 'Microsoft sign-in is not available right now — please try again.',
      });
    }
  };

  // When AuthContext is mid-Microsoft-exchange (after redirect arrives back
  // on /login), show a loading screen instead of flashing the password form.
  if (msSignInInProgress) {
    return (
      <Container maxWidth="xs">
        <Paper
          elevation={6}
          sx={{ mt: 12, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
        >
          <CircularProgress />
          <Typography variant="body1">Signing you in…</Typography>
        </Paper>
      </Container>
    );
  }

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

          {msalConfigured && (
            <>
              <Divider sx={{ my: 2 }}>or</Divider>
              <Button
                type="button"
                fullWidth
                variant="outlined"
                startIcon={<MicrosoftLogo />}
                onClick={handleMicrosoftLogin}
                disabled={msLoading}
                sx={{
                  mb: 1,
                  color: 'text.primary',
                  borderColor: 'divider',
                  textTransform: 'none',
                  fontWeight: 500,
                  '&:hover': { borderColor: 'text.primary' },
                }}
              >
                {msLoading ? 'Opening Microsoft sign-in…' : 'Sign in with Microsoft'}
              </Button>
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
}

