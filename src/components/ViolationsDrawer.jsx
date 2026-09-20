import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Alert,
  Stack,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  PushPin as PushPinIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { parseLocalDate } from '../utils/dates';

// Parse OptaPlanner's "-756hard/16162954014soft" into numbers.
function parseScore(score) {
  if (!score || typeof score !== 'string') return { hard: null, soft: null };
  const m = score.match(/(-?\d+)hard\/(-?\d+)soft/);
  if (!m) return { hard: null, soft: null };
  return { hard: Number(m[1]), soft: Number(m[2]) };
}

const fmtDate = (d) => {
  if (!d) return '';
  try {
    return format(parseLocalDate(d), 'EEE d MMM');
  } catch {
    return d;
  }
};

// Right-anchored drawer that shows OptaPlanner's score breakdown for a persisted
// rota: overall feasibility, the hard rules it breaks (with match counts), and
// every slot carrying a hard breach with the exact constraints it violates.
export default function ViolationsDrawer({ open, onClose, loading, error, data }) {
  const { hard, soft } = parseScore(data?.score);
  const feasible = hard === 0;

  const hardConstraints = (data?.constraints || [])
    .filter((c) => c.hard < 0)
    .sort((a, b) => a.hard - b.hard);

  const softDrivers = (data?.constraints || [])
    .filter((c) => c.soft && c.soft !== 0)
    .sort((a, b) => Math.abs(b.soft) - Math.abs(a.soft))
    .slice(0, 8);

  const slots = data?.violatingSlots || [];

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 480 } }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Feasibility &amp; score</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </Box>
      <Divider />

      <Box sx={{ p: 2, overflowY: 'auto' }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        )}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && data && (
          <>
            {/* Overall verdict */}
            <Alert
              severity={feasible ? 'success' : 'error'}
              icon={feasible ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
              sx={{ mb: 2 }}
            >
              {feasible
                ? 'Feasible — no hard constraints broken.'
                : `Infeasible — ${Math.abs(hard)} hard penalty across ${hardConstraints.reduce((n, c) => n + (c.matches || 0), 0)} breach(es).`}
              <Box sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: 12, opacity: 0.8 }}>
                {data.score}
              </Box>
            </Alert>

            {/* Hard rules broken */}
            {hardConstraints.length > 0 && (
              <>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  Hard rules broken
                </Typography>
                <List dense disablePadding sx={{ mb: 2 }}>
                  {hardConstraints.map((c) => (
                    <ListItem key={c.constraint} disableGutters
                      secondaryAction={<Chip size="small" color="error" label={`${c.matches} × (${c.hard})`} />}>
                      <ListItemText primary={c.constraint} />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {/* Soft score drivers */}
            {softDrivers.length > 0 && (
              <>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Top soft-score drivers
                </Typography>
                <List dense disablePadding sx={{ mb: 2 }}>
                  {softDrivers.map((c) => (
                    <ListItem key={c.constraint} disableGutters
                      secondaryAction={
                        <Chip size="small" variant="outlined"
                          color={c.soft < 0 ? 'warning' : 'success'}
                          label={`${c.soft > 0 ? '+' : ''}${c.soft.toLocaleString()}`} />
                      }>
                      <ListItemText primary={c.constraint}
                        secondary={`${c.matches} match${c.matches === 1 ? '' : 'es'}`} />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {/* Per-slot hard breaches */}
            <Divider sx={{ mb: 1 }} />
            <Typography variant="subtitle2" gutterBottom>
              Slots with hard breaches ({data.violatingSlotCount ?? slots.length})
            </Typography>
            {slots.length === 0 ? (
              <Typography variant="body2" color="text.secondary">None — no slot breaks a hard rule.</Typography>
            ) : (
              <List dense disablePadding>
                {slots.map((s) => (
                  <ListItem key={s.assignmentId} alignItems="flex-start" disableGutters
                    sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1 }}>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {s.location} · {s.shiftType}
                          </Typography>
                          {s.pinned && (
                            <Tooltip title="Pinned — solver cannot move this">
                              <PushPinIcon color="warning" sx={{ fontSize: 16 }} />
                            </Tooltip>
                          )}
                        </Stack>
                      }
                      secondary={
                        <>
                          <Typography variant="caption" color="text.secondary">
                            {fmtDate(s.date)} · {s.employee || 'unassigned'}
                          </Typography>
                          <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {(s.brokenConstraints || []).map((b) => (
                              <Chip key={b} size="small" color="error" variant="outlined" label={b} />
                            ))}
                          </Box>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}
      </Box>
    </Drawer>
  );
}
