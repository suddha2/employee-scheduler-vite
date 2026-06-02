import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Snackbar,
} from '@mui/material';
import {
  Inbox as InboxIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { listShiftRequests, resolveShiftRequest } from '../api/shiftRequests';
import { useShiftRequestsNotifications } from '../contexts/ShiftRequestsContext';
import SuitabilityMatrix, { SummaryBadge } from '../components/SuitabilityMatrix';
import { useAuth } from '../contexts/AuthContext';

const STATUS_FILTERS = ['PENDING', 'ALL', 'APPROVED', 'REJECTED', 'FILLED'];

const STATUS_CHIP_COLOR = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  FILLED: 'default',
};

const SUMMARY_RANK = { STRONG: 0, OK: 1, WEAK: 2 };

function formatShiftLine(shift) {
  if (!shift) return '';
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

function sortGroup(requests, statusFilter) {
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

export default function ShiftRequestsPage() {
  // Role-gated: only resolvers see the Approve/Reject buttons. Read-only and
  // people-managers (OPS_MANAGER excepted) still see the full list, just
  // without the action buttons.
  const { canResolveRequests } = useAuth();

  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [toast, setToast] = useState(null);

  const closeToast = () => setToast(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = statusFilter === 'ALL' ? null : statusFilter;
      const data = await listShiftRequests(null, status);
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load shift requests:', err);
      setError(err.response?.data?.message || 'Failed to load shift requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Subscribe to the app-level STOMP context. Any incoming payload bumps
  // `lastPayload`; we refetch on each one. Also mark the global counter as
  // read on mount so the sidebar badge clears when the admin opens this view.
  const { lastPayload, markAllRead } = useShiftRequestsNotifications();
  useEffect(() => { markAllRead(); }, [markAllRead]);
  useEffect(() => {
    if (!lastPayload) return;
    load();
  }, [lastPayload, load]);

  const groupedByRota = useMemo(() => {
    const map = new Map();
    for (const req of requests) {
      const key = req.rotaId ?? 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(req);
    }
    const groups = [];
    for (const [rotaId, reqs] of map.entries()) {
      groups.push({ rotaId, requests: sortGroup(reqs, statusFilter) });
    }
    groups.sort((a, b) => Number(a.rotaId) - Number(b.rotaId));
    return groups;
  }, [requests, statusFilter]);

  const totalPending = useMemo(
    () => requests.filter(r => r.status === 'PENDING').length,
    [requests]
  );

  const handleResolve = async (request, action) => {
    setResolvingId(request.id);
    try {
      await resolveShiftRequest(request.id, action);
      setToast({
        message: action === 'APPROVE' ? 'Request approved' : 'Request rejected',
        severity: 'success',
      });
      await load();
    } catch (err) {
      const status = err.response?.status;
      const serverMsg = err.response?.data?.message;
      let message;
      if (status === 404) message = 'Request not found';
      else if (status === 409) message = serverMsg || 'Request is already resolved';
      else if (status === 401 || status === 403) message = 'Session expired — please log in again';
      else message = serverMsg || 'Failed to resolve request';
      setToast({ message, severity: 'error' });
      await load();
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <InboxIcon />
        <Typography variant="h5">Shift Requests</Typography>
        {totalPending > 0 && (
          <Chip
            label={`${totalPending} pending`}
            color="warning"
            size="small"
            sx={{ ml: 1 }}
          />
        )}
      </Box>

      <ToggleButtonGroup
        value={statusFilter}
        exclusive
        size="small"
        onChange={(_, v) => v && setStatusFilter(v)}
        sx={{ mb: 3, flexWrap: 'wrap' }}
      >
        {STATUS_FILTERS.map((s) => (
          <ToggleButton key={s} value={s}>{s}</ToggleButton>
        ))}
      </ToggleButtonGroup>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && groupedByRota.length === 0 && (
        <Alert severity="info">No requests in this status.</Alert>
      )}

      {!loading && !error && groupedByRota.map((group) => (
        <Box key={group.rotaId} sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Rota #{group.rotaId}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              · {group.requests.length} request{group.requests.length === 1 ? '' : 's'}
            </Typography>
          </Box>
          <Divider sx={{ mb: 1.5 }} />
          <Stack spacing={1.5}>
            {group.requests.map((req) => {
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
                      {req.status === 'PENDING' && req.conflict && (
                        <Chip
                          label="Conflict"
                          size="small"
                          color="error"
                          icon={<WarningIcon />}
                        />
                      )}
                    </Stack>
                  </Box>

                  {req.status === 'PENDING' && <SuitabilityMatrix fit={req.fit} />}

                  {req.status === 'PENDING' && canResolveRequests && (
                    <>
                      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<ApproveIcon />}
                          onClick={() => handleResolve(req, 'APPROVE')}
                          disabled={isResolving || req.conflict}
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
                      {req.conflict && (
                        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                          Approval blocked — same-day conflict for this employee.
                        </Typography>
                      )}
                    </>
                  )}
                </Paper>
              );
            })}
          </Stack>
        </Box>
      ))}

      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={closeToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity || 'info'} onClose={closeToast} variant="filled">
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
