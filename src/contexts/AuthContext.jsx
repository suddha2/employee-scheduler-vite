import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { safeStorage } from '../utils/safeStorage';
import { API_ENDPOINTS } from '../api/endpoint';
import axiosInstance from '../components/axiosInstance';

const AuthContext = createContext(null);

// Capability map: which roles unlock which UI/server actions. Keeps role
// strings out of components — they read `canEditSchedule` etc. instead.
const ROLES_FOR = {
    canEditSchedule:    ['ADMIN', 'OPS_MANAGER', 'ROTA_EDITOR'],
    canResolveRequests: ['ADMIN', 'OPS_MANAGER', 'ROTA_EDITOR'],
    canPublishShifts:   ['ADMIN', 'OPS_MANAGER', 'ROTA_EDITOR'],
    canManagePeople:    ['ADMIN', 'OPS_MANAGER'],          // employees + shift templates
    canRegenerateRota:  ['ADMIN', 'OPS_MANAGER'],          // enqueue/reenqueue schedule
    canManageUsers:     ['ADMIN', 'OPS_MANAGER'],          // /api/admin/users (OPS_MANAGER restricted server-side)
    canGrantAdmin:      ['ADMIN'],                         // only ADMIN may grant the ADMIN role
};

export function AuthProvider({ children }) {
    const [token, setToken] = useState(safeStorage.get('token'));
    const [isAuthenticated, setIsAuthenticated] = useState(!!safeStorage.get('token'));
    // Roles are fetched from /me after authentication. While unloaded we deny
    // every capability — safer than briefly flashing edit controls to users
    // who turn out to be read-only.
    const [roles, setRoles] = useState([]);
    const [rolesLoaded, setRolesLoaded] = useState(false);
    const [username, setUsername] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Fetch /me whenever the token changes (login, page refresh with stored
    // token, etc.) and pull in the current user's roles. A 401 here = token
    // is no longer valid → session-expiry flow.
    const fetchMe = useCallback(async () => {
        try {
            const res = await axiosInstance.get(API_ENDPOINTS.me);
            const data = res.data || {};
            const nextRoles = Array.isArray(data.roles) ? data.roles.map(r => String(r).toUpperCase()) : [];
            setRoles(nextRoles);
            setUsername(data.userName || null);
            setRolesLoaded(true);
        } catch (err) {
            // Leave roles empty so the UI denies everything until we know better.
            setRoles([]);
            setUsername(null);
            setRolesLoaded(true);
            if (err?.response?.status === 401) {
                handleSessionExpiry();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const storedToken = safeStorage.get('token');
        if (storedToken && storedToken !== token) {
            setToken(storedToken);
            setIsAuthenticated(true);
        }
    }, [token]);

    // Whenever we have a token, refresh roles. Clears roles when we don't.
    useEffect(() => {
        if (token) {
            setRolesLoaded(false);
            fetchMe();
        } else {
            setRoles([]);
            setUsername(null);
            setRolesLoaded(false);
        }
    }, [token, fetchMe]);

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
        setRoles([]);
        setUsername(null);
        setRolesLoaded(false);
        sessionStorage.clear();
        navigate('/login');
    };

    const handleSessionExpiry = () => {
        if (location.pathname !== '/login') {
            sessionStorage.setItem('redirectAfterLogin', location.pathname + location.search);
            sessionStorage.setItem('sessionExpired', 'true');
        }

        safeStorage.remove('token');
        setToken(null);
        setIsAuthenticated(false);
        setRoles([]);
        setUsername(null);
        setRolesLoaded(false);

        navigate('/login', {
            state: {
                sessionExpired: true,
                from: location.pathname,
            },
            replace: true,
        });
    };

    // Capability helpers derived from the current roles. Memoised so consumers
    // can list them in dep arrays without churn.
    const capabilities = useMemo(() => {
        const roleSet = new Set(roles);
        const hasAny = (allowed) => allowed.some((r) => roleSet.has(r));
        return {
            hasRole: (r) => roleSet.has(String(r).toUpperCase()),
            isAdmin:       roleSet.has('ADMIN'),
            isOpsManager:  roleSet.has('OPS_MANAGER'),
            isRotaEditor:  roleSet.has('ROTA_EDITOR'),
            isReadOnly:    roleSet.size === 1 && roleSet.has('READ_ONLY'),
            canEditSchedule:    hasAny(ROLES_FOR.canEditSchedule),
            canResolveRequests: hasAny(ROLES_FOR.canResolveRequests),
            canPublishShifts:   hasAny(ROLES_FOR.canPublishShifts),
            canManagePeople:    hasAny(ROLES_FOR.canManagePeople),
            canRegenerateRota:  hasAny(ROLES_FOR.canRegenerateRota),
            canManageUsers:     hasAny(ROLES_FOR.canManageUsers),
            canGrantAdmin:      hasAny(ROLES_FOR.canGrantAdmin),
        };
    }, [roles]);

    const value = useMemo(() => ({
        token,
        isAuthenticated,
        roles,
        rolesLoaded,
        username,
        login,
        logout,
        handleSessionExpiry,
        refreshRoles: fetchMe,
        ...capabilities,
    }), [token, isAuthenticated, roles, rolesLoaded, username, capabilities, fetchMe]);

    return (
        <AuthContext.Provider value={value}>
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
