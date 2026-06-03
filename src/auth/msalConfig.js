import { PublicClientApplication } from '@azure/msal-browser';

// Read tenant + client from Vite env. With either missing the helper below
// reports `msalConfigured = false` and the Sign-in-with-Microsoft button on
// LoginPage hides itself — useful for local builds without the M365 creds.
const tenantId = import.meta.env.VITE_MS_TENANT_ID;
const clientId = import.meta.env.VITE_MS_CLIENT_ID;
const redirectUri =
    import.meta.env.VITE_MS_REDIRECT_URI ||
    (typeof window !== 'undefined'
        ? `${window.location.origin}/auth/microsoft/callback`
        : undefined);

export const msalConfigured = !!(tenantId && clientId);

// Scopes requested at login. openid+profile+email get us the claims for
// user lookup; User.Read is harmless and standard.
const SCOPES = ['openid', 'profile', 'email', 'User.Read'];

let msalInstance = null;
let msalReadyPromise = null;

function getInstance() {
    if (!msalConfigured) return null;
    if (msalInstance) return msalInstance;
    msalInstance = new PublicClientApplication({
        auth: {
            clientId,
            authority: `https://login.microsoftonline.com/${tenantId}`,
            redirectUri,
            navigateToLoginRequestUrl: false,
        },
        cache: {
            // sessionStorage so a closed tab forgets the MSAL state; we keep
            // our PASETO in safeStorage which is what actually persists login.
            cacheLocation: 'sessionStorage',
        },
    });
    // MSAL v3+ requires explicit initialise before use.
    msalReadyPromise = msalInstance.initialize();
    return msalInstance;
}

/**
 * Opens the Microsoft sign-in popup and returns the resulting ID token.
 * The caller (LoginPage) POSTs this token to /api/auth/microsoft which
 * returns a PASETO. Throws on cancel / popup-blocked / network error;
 * caller maps to a user-facing message.
 */
export async function loginWithMicrosoft() {
    const instance = getInstance();
    if (!instance) {
        throw new Error('Microsoft sign-in is not configured');
    }
    await msalReadyPromise;
    const result = await instance.loginPopup({
        scopes: SCOPES,
        prompt: 'select_account',
    });
    return result.idToken;
}
