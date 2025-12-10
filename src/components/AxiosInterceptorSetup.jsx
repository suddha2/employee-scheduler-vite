import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { setupAuthInterceptor } from './axiosInstance';

export function AxiosInterceptorSetup() {
    const { handleSessionExpiry } = useAuth();

    useEffect(() => {
        // Setup the axios interceptor with the auth context handler
        setupAuthInterceptor(handleSessionExpiry);
    }, [handleSessionExpiry]);

    return null; // This component doesn't render anything
}
