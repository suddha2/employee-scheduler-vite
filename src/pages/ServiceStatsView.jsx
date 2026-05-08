import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Grid, Alert, CircularProgress, Snackbar } from '@mui/material';
import { fetchServiceStats } from '../api/stats';
import ServiceStatsCard from '../components/ServiceStatsCard';

export default function ServiceStatsView() {
  const [searchParams] = useSearchParams();
  const rotaId = searchParams.get('id');

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((t) => setToast(t), []);
  const closeToast = () => setToast(null);

  useEffect(() => {
    if (!rotaId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchServiceStats(rotaId, { signal: controller.signal })
      .then((res) => setData(Array.isArray(res) ? res : []))
      .catch((err) => {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
        if (import.meta.env.DEV) console.error('Failed to load service stats:', err);
        setError(err.response?.data?.message || 'Failed to load service stats');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [rotaId]);

  if (!rotaId) {
    return (
      <Box sx={{ pt: 10, px: 2 }}>
        <Alert severity="info">
          No rota selected. Open a schedule first to view its service stats.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ pt: 10, px: 2, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ pt: 10, px: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const cards = data.flatMap((region) =>
    (region.services ?? []).map((service) => ({ region, service }))
  );

  if (cards.length === 0) {
    return (
      <Box sx={{ pt: 10, px: 2 }}>
        <Alert severity="info">No service stats available for this rota.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ pt: 10, px: 2 }}>
      <Grid container spacing={2}>
        {cards.map(({ region, service }) => (
          <Grid
            item
            xs={12}
            sm={6}
            md={4}
            key={`${region.region}|${service.location}`}
          >
            <ServiceStatsCard
              region={region}
              service={service}
              rotaId={rotaId}
              onToast={showToast}
            />
          </Grid>
        ))}
      </Grid>

      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={closeToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert
            severity={toast.severity || 'info'}
            onClose={closeToast}
            variant="filled"
          >
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
