import React from 'react';
import { Box, Button, Typography, Paper, Alert } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null, 
            errorInfo: null 
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        
        this.setState({
            error,
            errorInfo
        });

        // You can also log to an error reporting service here
        // Example: logErrorToService(error, errorInfo);
    }

    handleReset = () => {
        this.setState({ 
            hasError: false, 
            error: null, 
            errorInfo: null 
        });
        
        // Optionally reload the page or navigate
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    minHeight="100vh"
                    bgcolor="background.default"
                    p={3}
                >
                    <Paper elevation={3} sx={{ p: 4, maxWidth: 600 }}>
                        <Box display="flex" alignItems="center" mb={2}>
                            <ErrorOutlineIcon color="error" sx={{ fontSize: 48, mr: 2 }} />
                            <Typography variant="h4" color="error">
                                Something went wrong
                            </Typography>
                        </Box>

                        <Alert severity="error" sx={{ mb: 3 }}>
                            An unexpected error occurred. This has been logged and we'll look into it.
                        </Alert>

                        <Typography variant="body1" paragraph>
                            You can try refreshing the page or going back to the home page.
                        </Typography>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <Box mt={3}>
                                <Typography variant="h6" gutterBottom>
                                    Error Details (Development Only):
                                </Typography>
                                <Paper 
                                    variant="outlined" 
                                    sx={{ 
                                        p: 2, 
                                        bgcolor: 'grey.100', 
                                        maxHeight: 300, 
                                        overflow: 'auto' 
                                    }}
                                >
                                    <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {this.state.error.toString()}
                                        {'\n\n'}
                                        {this.state.errorInfo?.componentStack}
                                    </Typography>
                                </Paper>
                            </Box>
                        )}

                        <Box mt={3} display="flex" gap={2}>
                            <Button 
                                variant="contained" 
                                color="primary" 
                                onClick={this.handleReset}
                            >
                                Reload Page
                            </Button>
                            <Button 
                                variant="outlined" 
                                onClick={() => window.location.href = '/paycycleSchedule'}
                            >
                                Go to Home
                            </Button>
                        </Box>
                    </Paper>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;