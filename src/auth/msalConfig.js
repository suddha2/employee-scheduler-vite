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

// When loginWithMicrosoft() starts a redirect, we set this sessionStorage
// flag. On the return trip the SPA loads fresh — we read the flag at
// module load to know synchronously that a sign-in is in flight, so the
// LoginPage can render a loading screen instead of flashing the password
// form. The flag is NOT cleared on read because the SPA can reload more
// than once during the redirect bounce (e.g. /auth/microsoft/callback
// briefly, then /login). AuthContext clears the flag once the exchange
// finishes (success OR failure) via clearMsSignInPending().
const MS_PENDING_KEY = 'msSignInPending';
export const msalRedirectInFlight = (() => {
    if (!msalConfigured || typeof window === 'undefined') return false;
    try {
        return window.sessionStorage.getItem(MS_PENDING_KEY) === '1';
    } catch {
        return false;
    }
})();

export function clearMsSignInPending() {
    try { window.sessionStorage.removeItem(MS_PENDING_KEY); } catch { /* ignore */ }
}

// Scopes requested at login. openid+profile+email get us the claims for
// user lookup; User.Read is harmless and standard.
const SCOPES = ['openid', 'profile', 'email', 'User.Read'];

// Eagerly create + initialise MSAL at module load. After init we
// immediately call handleRedirectPromise() — this is what processes the
// auth response when the user comes back from Microsoft to
// /auth/microsoft/callback. The result is captured here; the
// MicrosoftCallback route component then reads it via consumeRedirectResult.
let msalInstance = null;
let msalReadyPromise = Promise.resolve();
let msalRedirectResult = null;
let msalInitError = null;

if (msalConfigured && typeof window !== 'undefined') {
    msalInstance = new PublicClientApplication({
        auth: {
            clientId,
            authority: `https://login.microsoftonline.com/${tenantId}`,
            redirectUri,
            navigateToLoginRequestUrl: false,
        },
        cache: {
            cacheLocation: 'sessionStorage',
        },
    });
    msalReadyPromise = msalInstance.initialize()
        .then(() => msalInstance.handleRedirectPromise())
        .then((result) => {
            msalRedirectResult = result;
            return result;
        })
        .catch((err) => {
            msalInitError = err;
            // eslint-disable-next-line no-console
            console.error('[MSAL] init / handleRedirectPromise failed', err);
        });
}

/**
 * Kicks off a Microsoft sign-in via FULL-PAGE redirect.
 *
 * The main window navigates to login.microsoftonline.com, the user
 * authenticates (and any MFA happens there), and Microsoft redirects back
 * to /auth/microsoft/callback. The MicrosoftCallback route component then
 * consumes the result, POSTs the ID token to /api/auth/microsoft, and
 * the resulting PASETO is installed via AuthContext.login.
 *
 * This function does NOT return — the page navigates away. Any error
 * thrown happens before the navigation (e.g. MSAL not configured / init
 * failed) so it's safe to handle synchronously in the caller.
 */
export async function loginWithMicrosoft() {
    if (!msalInstance) {
        throw new Error('Microsoft sign-in is not configured');
    }
    await msalReadyPromise;
    if (msalInitError) throw msalInitError;
    // Mark in-flight so the next page load knows to render a loading state
    // (read + cleared synchronously by `msalRedirectInFlight`).
    try { window.sessionStorage.setItem(MS_PENDING_KEY, '1'); } catch { /* ignore */ }
    await msalInstance.loginRedirect({
        scopes: SCOPES,
        prompt: 'select_account',
    });
}

/**
 * Returns the AuthenticationResult captured by handleRedirectPromise on
 * app start, or null if no Microsoft redirect was in flight. Consumes
 * the result so subsequent calls return null — prevents double-processing.
 */
export async function consumeRedirectResult() {
    if (!msalConfigured) return null;
    await msalReadyPromise;
    const r = msalRedirectResult;
    msalRedirectResult = null;
    return r;
}
