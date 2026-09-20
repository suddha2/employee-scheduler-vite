import { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Grid, FormControl, InputLabel, Select, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  TextField, IconButton, Button, ToggleButton, ToggleButtonGroup, Alert,
  CircularProgress, Tooltip, Divider,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../components/axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';

const DAYS = [
  ['MONDAY', 'Mon'], ['TUESDAY', 'Tue'], ['WEDNESDAY', 'Wed'], ['THURSDAY', 'Thu'],
  ['FRIDAY', 'Fri'], ['SATURDAY', 'Sat'], ['SUNDAY', 'Sun'],
];
const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

const newRow = () => ({
  shiftType: '', days: [], startTime: '', endTime: '', empCount: 1, rate: '',
});

// Bulk builder: pick a service, then add one row per shift type (its own days,
// times, headcount and optional rate override). Submitting fans each row out to
// the create endpoint, which itself expands the selected days into templates.
export default function ShiftTemplateBuilder() {
  const navigate = useNavigate();

  const [regions, setRegions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [shiftTypes, setShiftTypes] = useState([]);

  const [region, setRegion] = useState('');
  const [location, setLocation] = useState('');
  const [rows, setRows] = useState([newRow()]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null); // [{label, created, conflicts, error}]

  useEffect(() => {
    axiosInstance.get(`${API_ENDPOINTS.shiftTemplates}/regions`)
      .then((r) => setRegions(r.data || [])).catch(() => {});
    axiosInstance.get(API_ENDPOINTS.shiftTypes, { params: { active: true } })
      .then((r) => setShiftTypes(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLocation('');
    if (!region) { setLocations([]); return; }
    axiosInstance.get(`${API_ENDPOINTS.shiftTemplates}/regions/${region}/locations`)
      .then((r) => setLocations(r.data || [])).catch(() => setLocations([]));
  }, [region]);

  const updateRow = (i, field, value) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const toggleDays = (i, days) => updateRow(i, 'days', days);
  const setWeekdays = (i) => updateRow(i, 'days', [...WEEKDAYS]);
  const addRow = () => setRows((rs) => [...rs, newRow()]);
  const removeRow = (i) => setRows((rs) => (rs.length === 1 ? rs : rs.filter((_, idx) => idx !== i)));

  const rowValid = (r) => r.shiftType && r.days.length > 0 && r.startTime && r.endTime && Number(r.empCount) > 0;
  const canSubmit = region && location && rows.every(rowValid) && !submitting;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    setResults(null);
    const out = [];
    for (const r of rows) {
      const label = `${(shiftTypes.find((t) => t.code === r.shiftType)?.displayName) || r.shiftType} · ${r.days.length} day(s)`;
      try {
        const body = {
          location, region,
          shiftType: r.shiftType,           // raw code (data-driven type)
          daysOfWeek: r.days,
          startTime: r.startTime,
          endTime: r.endTime,
          empCount: Number(r.empCount),
          rate: r.rate === '' ? null : Number(r.rate),
          active: true,
        };
        const res = await axiosInstance.post(API_ENDPOINTS.shiftTemplates, body);
        out.push({ label, created: Array.isArray(res.data) ? res.data.length : 0 });
      } catch (e) {
        if (e.response?.status === 409) {
          out.push({ label, conflicts: e.response.data?.conflicts?.length || 0 });
        } else {
          out.push({ label, error: e.response?.data?.error || e.message || 'Failed' });
        }
      }
    }
    setResults(out);
    setSubmitting(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <IconButton onClick={() => navigate('/shift-templates')}><ArrowBackIcon /></IconButton>
          <Typography variant="h5" sx={{ flexGrow: 1 }}>Bulk create shift templates</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pick a service, then add a row per shift type — its days, times, headcount and (optional) rate override.
          Each row is expanded into one template per selected day.
        </Typography>

        {/* Step 1: service */}
        <Typography variant="subtitle1" gutterBottom>1. Service</Typography>
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

        <Divider sx={{ my: 2 }} />

        {/* Step 2: rows */}
        <Typography variant="subtitle1" gutterBottom>2. Shift types</Typography>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 160 }}>Shift type</TableCell>
                <TableCell sx={{ minWidth: 260 }}>Days</TableCell>
                <TableCell>Start</TableCell>
                <TableCell>End</TableCell>
                <TableCell sx={{ width: 90 }}>Count</TableCell>
                <TableCell sx={{ width: 110 }}>Rate (£/none)</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <FormControl fullWidth size="small">
                      <Select value={r.shiftType} displayEmpty onChange={(e) => updateRow(i, 'shiftType', e.target.value)}>
                        <MenuItem value="" disabled><em>Select type</em></MenuItem>
                        {shiftTypes.map((t) => <MenuItem key={t.code} value={t.code}>{t.displayName || t.code}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                      <ToggleButtonGroup size="small" value={r.days} onChange={(e, v) => toggleDays(i, v)}>
                        {DAYS.map(([code, label]) => (
                          <ToggleButton key={code} value={code} sx={{ px: 1 }}>{label}</ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                      <Tooltip title="Mon–Fri"><Button size="small" onClick={() => setWeekdays(i)}>M–F</Button></Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell><TextField type="time" size="small" value={r.startTime} onChange={(e) => updateRow(i, 'startTime', e.target.value)} /></TableCell>
                  <TableCell><TextField type="time" size="small" value={r.endTime} onChange={(e) => updateRow(i, 'endTime', e.target.value)} /></TableCell>
                  <TableCell><TextField type="number" size="small" value={r.empCount} onChange={(e) => updateRow(i, 'empCount', e.target.value)} inputProps={{ min: 1, style: { width: 60 } }} /></TableCell>
                  <TableCell><TextField type="number" size="small" placeholder="card" value={r.rate} onChange={(e) => updateRow(i, 'rate', e.target.value)} inputProps={{ min: 0, step: '0.01', style: { width: 80 } }} /></TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" disabled={rows.length === 1} onClick={() => removeRow(i)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Button startIcon={<AddIcon />} onClick={addRow} sx={{ mt: 1 }}>Add shift type</Button>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        {results && (
          <Alert severity={results.some((x) => x.error || x.conflicts) ? 'warning' : 'success'} sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Results</Typography>
            {results.map((x, i) => (
              <div key={i}>
                {x.label}: {x.created != null ? `${x.created} template(s) created` : x.conflicts != null ? `${x.conflicts} conflict(s) — already exist` : `error: ${x.error}`}
              </div>
            ))}
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button variant="outlined" onClick={() => navigate('/shift-templates')}>Done</Button>
          <Button variant="contained" startIcon={submitting ? <CircularProgress size={18} /> : <SaveIcon />}
            disabled={!canSubmit} onClick={submit}>
            {submitting ? 'Creating…' : 'Create all'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
