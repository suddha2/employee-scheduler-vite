import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { safeStorage } from '../utils/safeStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(safeStorage.get('token'));
    const [isAuthenticated, setIsAuthenticated] = useState(!!safeStorage.get('token'));
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const storedToken = safeStorage.get('token');
        if (storedToken && storedToken !== token) {
            setToken(storedToken);
            setIsAuthenticated(true);
        }
    }, [token]);

    const login = (newToken) => {
        safeStorage.set('token', newToken);
        setToken(newToken);
        setIsAuthenticated(true);

        // Restore previous location if saved
        const savedLocation = sessionStorage.getItem('redirectAfterLogin');
        const savedState = sessionStorage.getItem('appState');
        
        if (savedLocation) {
            sessionStorage.removeItem('redirectAfterLogin');
            if (savedState) {
                sessionStorage.removeItem('appState');
            }
            navigate(savedLocation, { state: { restored: true, appState: savedState } });
        } else {
            navigate('/paycycleSchedule');
        }
    };

    const logout = () => {
        safeStorage.remove('token');
        setToken(null);
        setIsAuthenticated(false);
        sessionStorage.clear(); // Clear any saved state
        navigate('/login');
    };

    const handleSessionExpiry = () => {
        // Save current location and state before redirecting
        if (location.pathname !== '/login') {
            sessionStorage.setItem('redirectAfterLogin', location.pathname + location.search);
            sessionStorage.setItem('sessionExpired', 'true');
        }
        
        safeStorage.remove('token');
        setToken(null);
        setIsAuthenticated(false);

        // Navigate instead of window.location.href to preserve React state
        navigate('/login', { 
            state: { 
                sessionExpired: true,
                from: location.pathname 
            },
            replace: true 
        });
    };

    return (
        <AuthContext.Provider value={{ 
            token, 
            isAuthenticated, 
            login, 
            logout, 
            handleSessionExpiry 
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
