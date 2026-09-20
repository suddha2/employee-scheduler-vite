import { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Grid, FormControl, InputLabel, Select, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  TextField, IconButton, Button, Checkbox, Alert, CircularProgress, Divider, Tooltip,
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../components/axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';

const DAYS = [
  ['MONDAY', 'Mon'], ['TUESDAY', 'Tue'], ['WEDNESDAY', 'Wed'], ['THURSDAY', 'Thu'],
  ['FRIDAY', 'Fri'], ['SATURDAY', 'Sat'], ['SUNDAY', 'Sun'],
];
const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const hhmm = (t) => (t ? String(t).slice(0, 5) : '');

// Grid builder: rows = every active shift type, columns = Mon–Sun tick boxes, plus
// per-row start/end/headcount. Loads the service's current templates so ticks reflect
// what exists; saving reconciles (create ticked, update, deactivate unticked). Rate is
// the type's own tag, so it isn't set here; pairing (LONG_DAY + SLEEP_IN) is implicit —
// tick both on the same days.
export default function ShiftTemplateBuilder() {
  const navigate = useNavigate();

  const [regions, setRegions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [shiftTypes, setShiftTypes] = useState([]);
  const [region, setRegion] = useState('');
  const [location, setLocation] = useState('');

  // grid: { [code]: { days:Set<string>, startTime, endTime, empCount } }
  const [grid, setGrid] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axiosInstance.get(`${API_ENDPOINTS.shiftTemplates}/regions`).then((r) => setRegions(r.data || [])).catch(() => {});
    axiosInstance.get(API_ENDPOINTS.shiftTypes, { params: { active: true } }).then((r) => setShiftTypes(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLocation('');
    setGrid({});
    setResult(null);
    if (!region) { setLocations([]); return; }
    axiosInstance.get(`${API_ENDPOINTS.shiftTemplates}/regions/${region}/locations`)
      .then((r) => setLocations(r.data || [])).catch(() => setLocations([]));
  }, [region]);

  // Build the grid for a location from its existing (active) templates.
  useEffect(() => {
    setResult(null);
    const empty = {};
    shiftTypes.forEach((t) => { empty[t.code] = { days: new Set(), startTime: '', endTime: '', empCount: 1 }; });
    if (!location) { setGrid(empty); return; }
    setLoading(true);
    axiosInstance.get(API_ENDPOINTS.shiftTemplatesByLocation(location), { params: { active: true } })
      .then((r) => {
        const g = empty;
        (r.data || []).forEach((tpl) => {
          const code = tpl.shiftType; // JSON key is the code
          if (!g[code]) g[code] = { days: new Set(), startTime: '', endTime: '', empCount: 1 };
          if (tpl.dayOfWeek) g[code].days.add(tpl.dayOfWeek);
          if (!g[code].startTime && tpl.startTime) g[code].startTime = hhmm(tpl.startTime);
          if (!g[code].endTime && tpl.endTime) g[code].endTime = hhmm(tpl.endTime);
          if (tpl.empCount) g[code].empCount = tpl.empCount;
        });
        setGrid({ ...g });
      })
      .catch(() => setError('Failed to load existing templates for this service'))
      .finally(() => setLoading(false));
  }, [location, shiftTypes]);

  const toggleDay = (code, day) => setGrid((g) => {
    const row = { ...g[code], days: new Set(g[code].days) };
    if (row.days.has(day)) row.days.delete(day); else row.days.add(day);
    return { ...g, [code]: row };
  });
  const setWeekdays = (code) => setGrid((g) => ({ ...g, [code]: { ...g[code], days: new Set(WEEKDAYS) } }));
  const setField = (code, field, val) => setGrid((g) => ({ ...g, [code]: { ...g[code], [field]: val } }));

  // A row with ticked days must have times; rows with no ticked days are fine (they clear that type).
  const invalidRow = (code) => {
    const r = grid[code]; if (!r) return false;
    return r.days.size > 0 && (!r.startTime || !r.endTime || Number(r.empCount) < 1);
  };
  const anyInvalid = shiftTypes.some((t) => invalidRow(t.code));
  const canSave = region && location && !anyInvalid && !saving && !loading;

  const save = async () => {
    setSaving(true); setError(null); setResult(null);
    try {
      const rows = shiftTypes.map((t) => {
        const r = grid[t.code] || { days: new Set() };
        return {
          shiftType: t.code,
          days: [...r.days],
          startTime: r.startTime || null,
          endTime: r.endTime || null,
          empCount: Number(r.empCount) || 1,
        };
      });
      const res = await axiosInstance.post(API_ENDPOINTS.shiftTemplatesBulk, { location, region, rows });
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, maxWidth: 1250, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <IconButton onClick={() => navigate('/shift-templates')}><ArrowBackIcon /></IconButton>
          <Typography variant="h5" sx={{ flexGrow: 1 }}>Service templates — grid</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pick a service, then tick the days each shift type runs and set its times/headcount. Ticks reflect what
          already exists; saving creates ticked cells, updates changed ones and removes unticked ones. Rate comes from
          the shift type; pairing is automatic — tick LONG_DAY and SLEEP_IN on the same days.
        </Typography>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Region</InputLabel>
              <Select value={region} label="Region" onChange={(e) => setRegion(e.target.value)}>
                {regions.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={5}>
            <FormControl fullWidth size="small" disabled={!region}>
              <InputLabel>Service (location)</InputLabel>
              <Select value={location} label="Service (location)" onChange={(e) => setLocation(e.target.value)}>
                {locations.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Divider sx={{ mb: 1 }} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : location ? (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 150 }}>Shift type</TableCell>
                  {DAYS.map(([code, label]) => <TableCell key={code} align="center" sx={{ px: 0.5 }}>{label}</TableCell>)}
                  <TableCell />
                  <TableCell>Start</TableCell>
                  <TableCell>End</TableCell>
                  <TableCell sx={{ width: 80 }}>Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shiftTypes.map((t) => {
                  const r = grid[t.code] || { days: new Set(), startTime: '', endTime: '', empCount: 1 };
                  const active = r.days.size > 0;
                  return (
                    <TableRow key={t.code} hover>
                      <TableCell>
                        <strong>{t.displayName || t.code}</strong>
                        {t.requiredSkill && (
                          <Typography variant="caption" color="text.secondary" display="block">needs: {t.requiredSkill}</Typography>
                        )}
                      </TableCell>
                      {DAYS.map(([d]) => (
                        <TableCell key={d} align="center" sx={{ px: 0.5 }}>
                          <Checkbox size="small" checked={r.days.has(d)} onChange={() => toggleDay(t.code, d)} />
                        </TableCell>
                      ))}
                      <TableCell><Tooltip title="Mon–Fri"><Button size="small" onClick={() => setWeekdays(t.code)}>M–F</Button></Tooltip></TableCell>
                      <TableCell><TextField type="time" size="small" value={r.startTime} disabled={!active}
                        error={active && !r.startTime} onChange={(e) => setField(t.code, 'startTime', e.target.value)} /></TableCell>
                      <TableCell><TextField type="time" size="small" value={r.endTime} disabled={!active}
                        error={active && !r.endTime} onChange={(e) => setField(t.code, 'endTime', e.target.value)} /></TableCell>
                      <TableCell><TextField type="number" size="small" value={r.empCount} disabled={!active}
                        inputProps={{ min: 1, style: { width: 56 } }} onChange={(e) => setField(t.code, 'empCount', e.target.value)} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">Select a region and service to edit its templates.</Alert>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {result && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Saved — {result.created} created, {result.updated} updated, {result.deactivated} removed.
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button variant="outlined" onClick={() => navigate('/shift-templates')}>Done</Button>
          <Button variant="contained" startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />}
            disabled={!canSave} onClick={save}>{saving ? 'Saving…' : 'Save templates'}</Button>
        </Box>
      </Paper>
    </Box>
  );
}
