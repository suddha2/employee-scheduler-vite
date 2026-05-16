import { useEffect, useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { fetchServicePublishLog } from '../api/stats';

// One audit-trail entry: when it was published, by whom, the shift count, the
// broadcast outcome and (if any) the notification text.
function PublishLogRow({ entry }) {
  const when = entry.publishedAt
    ? new Date(entry.publishedAt).toLocaleString()
    : '—';
  const sent = entry.broadcastSent;
  const count = entry.unallocatedCount ?? 0;
  return (
    <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        {sent
          ? <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
          : <CancelIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{when}</Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25 }}>
        {entry.publishedBy || 'Unknown'} · {count} shift{count === 1 ? '' : 's'}
        {sent ? '' : ' · not broadcast'}
      </Typography>
      {entry.notificationTitle && (
        <Typography
          variant="caption"
          color="text.secondary"
          component="div"
          sx={{ mt: 0.25, fontStyle: 'italic' }}
        >
          {entry.notificationTitle}
        </Typography>
      )}
    </Box>
  );
}

// Right-anchored drawer showing a service's publish audit trail. The API call
// is fired only when the drawer opens, not on stats-screen render.
export default function PublishHistoryDrawer({ open, onClose, rotaId, service }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    if (!open || !rotaId || !service) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchServicePublishLog(rotaId, service, { signal: controller.signal })
      .then((data) => setEntries(data))
      .catch((err) => {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
        setError(err.response?.data?.message || 'Failed to load publish history');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [open, rotaId, service]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 380, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
          <Box>
            <Typography variant="h6">Publish history</Typography>
            <Typography variant="body2" color="text.secondary">{service}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          )}
          {!loading && error && (
            <Typography sx={{ p: 2 }} color="error">{error}</Typography>
          )}
          {!loading && !error && entries?.length === 0 && (
            <Typography sx={{ p: 2 }} color="text.secondary">
              This service has not been published yet.
            </Typography>
          )}
          {!loading && !error && entries?.length > 0 &&
            entries.map((entry) => <PublishLogRow key={entry.id} entry={entry} />)}
        </Box>
      </Box>
    </Drawer>
  );
}
