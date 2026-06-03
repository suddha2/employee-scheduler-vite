import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { safeStorage } from '../utils/safeStorage';
import { API_ENDPOINTS } from '../api/endpoint';
import axiosInstance from '../components/axiosInstance';
import { consumeRedirectResult, msalConfigured, msalRedirectInFlight, clearMsSignInPending } from '../auth/msalConfig';

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
    // True between landing back from a Microsoft redirect and the backend
    // exchange completing — LoginPage uses it to render a loading screen
    // instead of flashing the password form. Initialised synchronously from
    // a sessionStorage flag that loginWithMicrosoft sets before redirecting.
    const [msSignInInProgress, setMsSignInInProgress] = useState(msalRedirectInFlight);
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

    // Handle a pending Microsoft sign-in redirect result on EVERY mount.
    // This runs whichever page the user lands on (/auth/microsoft/callback,
    // /login, /, etc.), which makes the flow resilient to mid-redirect
    // bounces (e.g. another context's 401 reloads the page to /login —
    // AuthContext on /login will still pick up MSAL's cached result and
    // finish the sign-in).
    //
    // Ref guard so React StrictMode's double-effect doesn't consume the
    // one-shot result on the first mount and bail on the second.
    const msRedirectHandledRef = useRef(false);
    useEffect(() => {
        if (!msalConfigured) return;
        if (msRedirectHandledRef.current) return;
        msRedirectHandledRef.current = true;

        (async () => {
            try {
                const result = await consumeRedirectResult();
                if (!result?.idToken) {
                    // Stale flag (user closed browser mid-redirect) — clear so the
                    // login form shows instead of an indefinite spinner.
                    clearMsSignInPending();
                    setMsSignInInProgress(false);
                    return;
                }
                const response = await axios.post(API_ENDPOINTS.microsoftLogin, {
                    idToken: result.idToken,
                });
                clearMsSignInPending();
                // Inline of login() — avoids a recursive call from useEffect.
                safeStorage.set('token', response.data.token);
                setToken(response.data.token);
                setIsAuthenticated(true);
                // Leave msSignInInProgress=true through the navigate so the
                // login form never flashes; LoginPage unmounts once we land.
                navigate('/paycycleSchedule', { replace: true });
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('[AuthContext] Microsoft sign-in exchange failed:', err);
                clearMsSignInPending();
                setMsSignInInProgress(false);
            }
        })();
        // Intentionally only on mount — the redirect result is one-shot.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        // msSignInInProgress is left `true` after a successful Microsoft sign-in
        // so the login form doesn't flash during the navigate to /paycycleSchedule.
        // Clear it on logout, otherwise LoginPage remounts and shows the spinner
        // indefinitely. clearMsSignInPending() removes the sessionStorage flag too
        // so a future page refresh starts clean.
        clearMsSignInPending();
        setMsSignInInProgress(false);
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
        clearMsSignInPending();
        setMsSignInInProgress(false);

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
        msSignInInProgress,
        login,
        logout,
        handleSessionExpiry,
        refreshRoles: fetchMe,
        ...capabilities,
    }), [token, isAuthenticated, roles, rolesLoaded, username, msSignInInProgress, capabilities, fetchMe]);

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
