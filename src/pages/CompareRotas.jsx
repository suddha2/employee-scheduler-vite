import { useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Alert, CircularProgress, Chip, Tooltip,
} from '@mui/material';
import { Compare as CompareIcon } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../components/axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';

// Metric rows: key, label, tooltip, and `better` = which direction is "good"
// ('high' | 'low' | null). Used to highlight the stronger column.
const METRICS = [
  ['fillPct', 'Fill %', 'Share of slots filled', 'high'],
  ['weeksPerPattern', 'Weeks per pattern', 'How many weeks a carer repeats the same weekday-slot (higher = more stable/continuous)', 'high'],
  ['carers', 'Carers used', 'Distinct carers in the rota (fewer = more concentrated/continuous)', null],
  ['belowMinHours', 'Carers below min hours', 'Carers whose period hours fall under their contracted minimum', 'low'],
  ['genderMismatch', 'Gender mismatches', 'Assignments where the carer’s gender ≠ the shift’s required gender', 'low'],
  ['restrictedDay', 'Restricted-day breaches', 'Assignments on a day the carer is restricted from', 'low'],
  ['restrictedShift', 'Restricted-shift breaches', 'Assignments of a shift type the carer is restricted from', 'low'],
  ['restrictedService', 'Restricted-service breaches', 'Assignments at a service the carer is restricted from', 'low'],
  ['slots', 'Total slots', 'Total shift slots in the period', null],
  ['filled', 'Filled slots', 'Slots with a carer assigned', 'high'],
];

const PROFILE_COLOR = { SPREAD: 'info', CONTINUITY: 'secondary' };

export default function CompareRotas() {
  const [params] = useSearchParams();
  const [a, setA] = useState(params.get('a') || '');
  const [b, setB] = useState(params.get('b') || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    if (!a || !b) { setError('Enter both rota ids'); return; }
    setLoading(true); setError(null); setData(null);
    try {
      const r = await axiosInstance.get(API_ENDPOINTS.rotaCompare(a.trim(), b.trim()));
      setData(r.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Compare failed');
    } finally {
      setLoading(false);
    }
  };

  const header = (side) => {
    const s = data?.[side];
    if (!s?.found) return `Rota ${s?.rotaId ?? '—'}`;
    return s;
  };

  // Which side is better for a metric (for subtle highlight). Returns 'a' | 'b' | null.
  const betterSide = (key, dir) => {
    if (!dir || !data?.a?.found || !data?.b?.found) return null;
    const va = Number(data.a[key]), vb = Number(data.b[key]);
    if (va === vb) return null;
    if (dir === 'high') return va > vb ? 'a' : 'b';
    return va < vb ? 'a' : 'b';
  };

  const cell = (side, key, dir) => {
    const s = data?.[side];
    if (!s?.found) return '—';
    const val = s[key];
    const win = betterSide(key, dir) === side;
    return (
      <span style={win ? { fontWeight: 700, color: '#2e7d32' } : undefined}>
        {key === 'fillPct' ? `${val}%` : String(val)}
      </span>
    );
  };

  const colHead = (side) => {
    const s = data?.[side];
    if (!s) return side.toUpperCase();
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <span>Rota {s.rotaId}</span>
        {s.found && s.profile && (
          <Chip size="small" label={s.profile} color={PROFILE_COLOR[s.profile] || 'default'} sx={{ alignSelf: 'flex-start' }} />
        )}
        {s.found && s.startDate && (
          <Typography variant="caption" color="text.secondary">{s.startDate} → {s.endDate}</Typography>
        )}
        {s.found && s.region && <Typography variant="caption" color="text.secondary">{s.region}</Typography>}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CompareIcon />
          <Typography variant="h5">Compare Rotas</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Compare two rotas of the same period — typically the same weeks solved in <strong>Spread</strong> vs
          <strong> Continuity</strong> mode — to see the trade-off before publishing one.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
          <TextField label="Rota A id" size="small" value={a} onChange={(e) => setA(e.target.value)} sx={{ width: 140 }} />
          <TextField label="Rota B id" size="small" value={b} onChange={(e) => setB(e.target.value)} sx={{ width: 140 }} />
          <Button variant="contained" startIcon={loading ? <CircularProgress size={16} /> : <CompareIcon />}
            onClick={run} disabled={loading}>Compare</Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {data && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Metric</strong></TableCell>
                  <TableCell align="right">{colHead('a')}</TableCell>
                  <TableCell align="right">{colHead('b')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {METRICS.map(([key, label, tip, dir]) => (
                  <TableRow key={key} hover>
                    <TableCell>
                      <Tooltip title={tip}><span>{label}</span></Tooltip>
                    </TableCell>
                    <TableCell align="right">{cell('a', key, dir)}</TableCell>
                    <TableCell align="right">{cell('b', key, dir)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {data && (!data.a?.found || !data.b?.found) && (
          <Alert severity="warning" sx={{ mt: 2 }}>One or both rota ids had no assignments.</Alert>
        )}
      </Paper>
    </Box>
  );
}
