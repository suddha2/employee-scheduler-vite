import { Fragment, useEffect, useMemo, useState } from 'react';
import { usePersistedState, useSharedRegion } from '../hooks/usePersistedState';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Paper, Select, Snackbar, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tabs, Typography,
} from '@mui/material';
import {
  ExpandLess as ExpandLessIcon, ExpandMore as ExpandMoreIcon, PushPin as PushPinIcon,
} from '@mui/icons-material';
import axiosInstance from '../components/axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';
import { useAuth } from '../contexts/AuthContext';

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const dayShort = (d) => (d ? d.charAt(0) + d.slice(1, 3).toLowerCase() : '');
const shiftLabel = (s) => (s || '').replaceAll('_', ' ').toLowerCase();
const when = (v) => (v ? new Date(v).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—');

// One row per carer, house and shift type, with the days and weeks it covers.
const groupPins = (pins) => {
  const groups = new Map();
  pins.forEach((p) => {
    const key = `${p.employeeId}|${p.location}|${p.shiftType}`;
    if (!groups.has(key)) groups.set(key, { key, carer: p.carer, carerActive: p.carerActive, location: p.location, shiftType: p.shiftType, pins: [] });
    groups.get(key).pins.push(p);
  });
  return [...groups.values()].map((g) => ({
    ...g,
    pins: [...g.pins].sort((a, b) => a.week - b.week || DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)),
    days: DAY_ORDER.filter((d) => g.pins.some((p) => p.dayOfWeek === d)).map(dayShort).join(' '),
    weeks: [...new Set(g.pins.map((p) => p.week))].sort((a, b) => a - b).join(', '),
  }));
};

export default function StandingPins() {
  const { canManagePeople } = useAuth();

  const [regions, setRegions] = useState([]);
  const [region, setRegionRaw] = useSharedRegion();
  const [pins, setPins] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  // Remembered for this browser tab. Ticked pins are deliberately NOT kept:
  // coming back to old ticks and pressing Remove would remove the wrong pins.
  const [tab, setTab] = usePersistedState('ui:pins:tab', 'pins');

  const [house, setHouse] = usePersistedState('ui:pins:house', '');
  const [carer, setCarer] = usePersistedState('ui:pins:carer', '');
  const [selected, setSelected] = useState(new Set());
  const [open, setOpen] = usePersistedState('ui:pins:open', () => new Set());

  // House and carer belong to a region, so a new region starts them afresh.
  const setRegion = (r) => {
    if (r === region) return;
    setHouse('');
    setCarer('');
    setOpen(new Set());
    setRegionRaw(r);
  };
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const showToast = (message, severity = 'success') => setToast({ message, severity });

  useEffect(() => {
    axiosInstance.get(`${API_ENDPOINTS.shiftTemplates}/regions`).then((r) => setRegions(r.data || [])).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, h] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.standingPins, { params: { region } }),
        axiosInstance.get(API_ENDPOINTS.standingPinRemovals, { params: { region } }),
      ]);
      const list = p.data || [];
      setPins(list);
      setHistory(h.data || []);
      setSelected(new Set());
      // Drop a remembered house/carer that has no pins any more.
      setHouse((v) => (v && !list.some((x) => x.location === v) ? '' : v));
      setCarer((v) => (v && !list.some((x) => x.carer === v) ? '' : v));
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load pins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (region) load(); else { setPins([]); setHistory([]); }
  }, [region]);

  // A remembered region that no longer exists is dropped.
  useEffect(() => {
    if (regions.length && region && !regions.includes(region)) setRegion('');
  }, [regions]);

  const houses = useMemo(() => [...new Set(pins.map((p) => p.location))].sort(), [pins]);
  const carers = useMemo(() => [...new Set(pins.map((p) => p.carer))].sort(), [pins]);
  const shown = useMemo(() => pins.filter((p) => (!house || p.location === house) && (!carer || p.carer === carer)), [pins, house, carer]);
  const groups = useMemo(() => groupPins(shown), [shown]);

  const allShown = shown.length > 0 && shown.every((p) => selected.has(p.id));
  const someShown = shown.some((p) => selected.has(p.id));

  const setPinsSelected = (list, on) => setSelected((s) => {
    const next = new Set(s);
    list.forEach((p) => (on ? next.add(p.id) : next.delete(p.id)));
    return next;
  });

  const toggleOpen = (key) => setOpen((s) => {
    const next = new Set(s);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const chosen = pins.filter((p) => selected.has(p.id));
  const chosenCarers = [...new Set(chosen.map((p) => p.carer))].sort();

  const removeChosen = async () => {
    setBusy(true);
    try {
      await axiosInstance.post(API_ENDPOINTS.standingPinRemove, { region, pinIds: chosen.map((p) => p.id) });
      showToast(`Removed ${chosen.length} pin${chosen.length === 1 ? '' : 's'}`);
      setConfirming(false);
      await load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Remove failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const undo = async (row) => {
    if (!window.confirm(`Put back the ${row.pin_count} pins from this removal?`)) return;
    try {
      const r = await axiosInstance.post(API_ENDPOINTS.standingPinUndo(row.id));
      showToast(`Put back ${r.data.restored} pin${r.data.restored === 1 ? '' : 's'}`);
      await load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Undo failed', 'error');
    }
  };

  const latestRemoval = history.find((r) => !r.undone_at);

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <PushPinIcon />
          <Typography variant="h5">Standing Pins</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          A standing pin puts a carer on the same shift every period. Removing one takes effect on the next solve:
          the solver then fills the shift itself. Rotas already saved don&apos;t change.
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Region</InputLabel>
            <Select label="Region" value={region} onChange={(e) => setRegion(e.target.value)}>
              {regions.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }} disabled={!region}>
            <InputLabel shrink>House</InputLabel>
            <Select label="House" notched displayEmpty value={house} onChange={(e) => setHouse(e.target.value)}>
              <MenuItem value="">All houses</MenuItem>
              {houses.map((h) => <MenuItem key={h} value={h}>{h}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }} disabled={!region}>
            <InputLabel shrink>Carer</InputLabel>
            <Select label="Carer" notched displayEmpty value={carer} onChange={(e) => setCarer(e.target.value)}>
              <MenuItem value="">All carers</MenuItem>
              {carers.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab value="pins" label={region ? `Pins (${shown.length})` : 'Pins'} />
          <Tab value="history" label="Removal history" />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}

        {!loading && tab === 'pins' && (
          !region ? <Alert severity="info">Choose a region.</Alert>
            : pins.length === 0 ? <Alert severity="success">No standing pins in this region.</Alert> : (
              <>
                {canManagePeople && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FormControlLabel label={`Select all shown (${shown.length})`} control={
                      <Checkbox size="small" checked={allShown} indeterminate={someShown && !allShown}
                        onChange={(e) => setPinsSelected(shown, e.target.checked)} />
                    } />
                    <Box sx={{ flexGrow: 1 }} />
                    <Button variant="contained" color="error" disabled={chosen.length === 0} onClick={() => setConfirming(true)}>
                      Remove selected ({chosen.length})
                    </Button>
                  </Box>
                )}
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {canManagePeople && <TableCell padding="checkbox" />}
                        <TableCell><strong>Carer</strong></TableCell>
                        <TableCell><strong>House</strong></TableCell>
                        <TableCell><strong>Shift type</strong></TableCell>
                        <TableCell><strong>Days</strong></TableCell>
                        <TableCell><strong>Weeks</strong></TableCell>
                        <TableCell align="center"><strong>Pins</strong></TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {groups.map((g) => {
                        const all = g.pins.every((p) => selected.has(p.id));
                        const some = g.pins.some((p) => selected.has(p.id));
                        return (
                          <Fragment key={g.key}>
                            <TableRow hover>
                              {canManagePeople && (
                                <TableCell padding="checkbox">
                                  <Checkbox size="small" checked={all} indeterminate={some && !all}
                                    onChange={(e) => setPinsSelected(g.pins, e.target.checked)} />
                                </TableCell>
                              )}
                              <TableCell>
                                {g.carer}
                                {!g.carerActive && <Chip size="small" label="Left" color="warning" variant="outlined" sx={{ ml: 1 }} />}
                              </TableCell>
                              <TableCell>{g.location}</TableCell>
                              <TableCell>{shiftLabel(g.shiftType)}</TableCell>
                              <TableCell>{g.days}</TableCell>
                              <TableCell>{g.weeks}</TableCell>
                              <TableCell align="center">{g.pins.length}</TableCell>
                              <TableCell align="right" padding="none">
                                <IconButton size="small" aria-label={open.has(g.key) ? 'Hide pins' : 'Show pins'} onClick={() => toggleOpen(g.key)}>
                                  {open.has(g.key) ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                </IconButton>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell colSpan={canManagePeople ? 8 : 7} sx={{ py: 0, border: open.has(g.key) ? undefined : 0 }}>
                                <Collapse in={open.has(g.key)} unmountOnExit>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 1, pl: 5 }}>
                                    {g.pins.map((p) => (
                                      canManagePeople ? (
                                        <FormControlLabel key={p.id} label={`${dayShort(p.dayOfWeek)} wk ${p.week}`} control={
                                          <Checkbox size="small" checked={selected.has(p.id)}
                                            onChange={(e) => setPinsSelected([p], e.target.checked)} />
                                        } />
                                      ) : <Chip key={p.id} size="small" label={`${dayShort(p.dayOfWeek)} wk ${p.week}`} />
                                    ))}
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )
        )}

        {!loading && tab === 'history' && (
          !region ? <Alert severity="info">Choose a region.</Alert>
            : history.length === 0 ? <Alert severity="info">No pins have been removed in this region yet.</Alert> : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>When</strong></TableCell>
                      <TableCell><strong>By</strong></TableCell>
                      <TableCell align="center"><strong>Pins</strong></TableCell>
                      <TableCell><strong>Carers</strong></TableCell>
                      <TableCell align="right"><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map((r) => (
                      <TableRow key={r.id} hover sx={{ opacity: r.undone_at ? 0.55 : 1 }}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{when(r.removed_at)}</TableCell>
                        <TableCell>{r.removed_by || '—'}</TableCell>
                        <TableCell align="center">{r.pin_count}</TableCell>
                        <TableCell>{r.carers}</TableCell>
                        <TableCell align="right">
                          {r.undone_at ? <Chip size="small" variant="outlined" label="Undone" />
                            : canManagePeople && r.id === latestRemoval?.id ? <Button size="small" color="error" onClick={() => undo(r)}>Undo</Button>
                              : <Typography variant="caption" color="text.secondary">Removed</Typography>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
        )}
      </Paper>

      <Dialog open={confirming} onClose={() => setConfirming(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Remove {chosen.length} pin{chosen.length === 1 ? '' : 's'}?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" gutterBottom>
            <strong>Carers:</strong> {chosenCarers.join(', ')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The solver will fill these shifts itself from the next solve. You can undo this from Removal history.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={removeChosen} disabled={busy}
            startIcon={busy ? <CircularProgress size={18} /> : null}>Remove</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4500} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>{toast.message}</Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
