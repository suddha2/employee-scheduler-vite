import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Transient page at /auth/microsoft/callback after a Microsoft loginRedirect.
 *
 * The actual token exchange + login is handled in AuthContext (mounted at
 * the app root) so the flow survives even if another context/effect bounces
 * us to /login mid-process. This component just renders a friendly
 * "Signing you in…" while AuthContext does the work; once the PASETO is
 * issued, AuthContext.navigate replaces this route with /paycycleSchedule.
 */
export default function MicrosoftCallback() {
    return (
        <Box
            sx={{
                minHeight: '60vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                p: 3,
            }}
        >
            <CircularProgress />
            <Typography variant="body1">Signing you in…</Typography>
        </Box>
    );
}
