import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Chip,
  Button,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  Inbox as InboxIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { listShiftRequests, resolveShiftRequest } from '../api/shiftRequests';
import SuitabilityMatrix, { SummaryBadge } from './SuitabilityMatrix';

const SUMMARY_RANK = { STRONG: 0, OK: 1, WEAK: 2 };

// Default order for PENDING: STRONG > OK > WEAK > unknown, then oldest first.
// For audit views (approved/rejected/filled/all), most-recent activity first.
function sortRequests(requests, statusFilter) {
  const arr = [...requests];
  if (statusFilter === 'PENDING') {
    arr.sort((a, b) => {
      const ra = SUMMARY_RANK[a.fit?.summary] ?? 99;
      const rb = SUMMARY_RANK[b.fit?.summary] ?? 99;
      if (ra !== rb) return ra - rb;
      return new Date(a.requestedAt) - new Date(b.requestedAt);
    });
  } else {
    arr.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  }
  return arr;
}

const STATUS_FILTERS = ['PENDING', 'ALL', 'APPROVED', 'REJECTED', 'FILLED'];

const STATUS_CHIP_COLOR = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  FILLED: 'default',
};

function formatShiftLine(shift) {
  if (!shift) return '';
  // shift.shiftStart is "YYYY-MM-DD"; build a Date in local time so the day-of-week is correct.
  const dateLabel = format(new Date(`${shift.shiftStart}T00:00:00`), 'EEE d MMM');
  const start = (shift.startTime || '').slice(0, 5);
  const end = (shift.endTime || '').slice(0, 5);
  const type = (shift.shiftType || '').replaceAll('_', ' ');
  return `${dateLabel}, ${start}–${end} · ${shift.location} · ${type}`;
}

function relativeTime(iso) {
  if (!iso) return '';
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export default function ShiftRequestsDrawer({
  open,
  onClose,
  rotaId,
  refreshSignal,
  setSnackbar,
  onResolved,
}) {
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  const sortedRequests = useMemo(
    () => sortRequests(requests, statusFilter),
    [requests, statusFilter]
  );

  const load = useCallback(async () => {
    if (!rotaId) return;
    setLoading(true);
    setError(null);
    try {
      const status = statusFilter === 'ALL' ? null : statusFilter;
      const data = await listShiftRequests(rotaId, status);
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load shift requests:', err);
      setError(err.response?.data?.message || 'Failed to load shift requests');
    } finally {
      setLoading(false);
    }
  }, [rotaId, statusFilter]);

  useEffect(() => {
    if (open) load();
  }, [open, load, refreshSignal]);

  const toast = (message) => {
    if (setSnackbar) setSnackbar({ message, opened: true });
  };

  const handleResolve = async (request, action) => {
    setResolvingId(request.id);
    try {
      await resolveShiftRequest(request.id, action);
      toast(action === 'APPROVE' ? 'Request approved' : 'Request rejected');
      await load();
      if (action === 'APPROVE' && onResolved) onResolved();
    } catch (err) {
      const status = err.response?.status;
      const serverMsg = err.response?.data?.message;
      if (status === 404) {
        toast('Request not found');
      } else if (status === 409) {
        toast(serverMsg || 'Request is already resolved');
      } else if (status === 401 || status === 403) {
        toast('Session expired — please log in again');
      } else {
        toast(serverMsg || 'Failed to resolve request');
      }
      await load();
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 480 } }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InboxIcon />
            <Typography variant="h6">Shift Requests</Typography>
          </Box>
          <IconButton onClick={onClose} size="small" aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Box>

        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          size="small"
          onChange={(_, v) => v && setStatusFilter(v)}
          sx={{ mb: 2, flexWrap: 'wrap' }}
        >
          {STATUS_FILTERS.map((s) => (
            <ToggleButton key={s} value={s}>{s}</ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Divider sx={{ mb: 2 }} />

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        {!loading && !error && sortedRequests.length === 0 && (
          <Alert severity="info">No requests in this status.</Alert>
        )}

        {!loading && !error && sortedRequests.length > 0 && (
          <Stack spacing={1.5} sx={{ maxHeight: 'calc(100vh - 220px)', overflow: 'auto' }}>
            {sortedRequests.map((req) => {
              const isResolving = resolvingId === req.id;
              return (
                <Paper key={req.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap>{req.employeeName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatShiftLine(req.shift)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {req.shift?.durationInHours}h · requested {relativeTime(req.requestedAt)}
                      </Typography>
                    </Box>
                    <Stack direction="column" alignItems="flex-end" spacing={0.5}>
                      <Chip
                        label={req.status}
                        size="small"
                        color={STATUS_CHIP_COLOR[req.status] || 'default'}
                      />
                      {req.status === 'PENDING' && <SummaryBadge summary={req.fit?.summary} />}
                    </Stack>
                  </Box>

                  {req.status === 'PENDING' && <SuitabilityMatrix fit={req.fit} />}

                  {req.status === 'PENDING' && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<ApproveIcon />}
                        onClick={() => handleResolve(req, 'APPROVE')}
                        disabled={isResolving}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        startIcon={<RejectIcon />}
                        onClick={() => handleResolve(req, 'REJECT')}
                        disabled={isResolving}
                      >
                        Reject
                      </Button>
                      {isResolving && <CircularProgress size={20} sx={{ alignSelf: 'center' }} />}
                    </Stack>
                  )}
                </Paper>
              );
            })}
          </Stack>
        )}

        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" fullWidth onClick={load} disabled={loading}>
            Reload
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
