import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        // Save the attempted location
        sessionStorage.setItem('redirectAfterLogin', location.pathname + location.search);
        
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}
