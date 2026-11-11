import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardActionArea, CardContent, Chip, CircularProgress, Grid, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../components/axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';
import { useAuth } from '../contexts/AuthContext';
import { fmtWeekdayDate } from '../utils/dates';

const DAY_MS = 24 * 60 * 60 * 1000;
const parseDate = (d) => new Date(`${d}T00:00:00`);
const longDate = (d) => fmtWeekdayDate(parseDate(d));
const daysBetween = (from, to) => Math.round((parseDate(to) - parseDate(from)) / DAY_MS);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const sum = (rows, pick) => rows.reduce((total, r) => total + pick(r), 0);
const percentFilled = (r) => (r.shifts ? `${Math.floor((1000 * r.filled) / r.shifts) / 10}%` : '—');
const periodName = (p, fallback) => (p ? p.name.replace(' - ', ' ') : fallback);

// One figure that needs someone's attention. Clear items stay on screen, so an empty day reads as good news.
function AttentionCard({ count, label, hint, onClick }) {
  const needed = count > 0;
  return (
    <Card variant="outlined" sx={{ height: '100%', borderColor: needed ? 'warning.main' : 'divider' }}>
      <CardActionArea onClick={onClick} disabled={!onClick} sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h4" component="div" color={needed ? 'warning.dark' : 'text.secondary'}>{count}</Typography>
          <Typography variant="body2" fontWeight="medium">{label}</Typography>
          <Typography variant="caption" color="text.secondary">{hint}</Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function RotaCell({ rota, onOpen }) {
  if (rota.status === 'SOLVING') return <Chip size="small" color="info" label="Solving" />;
  if (rota.status === 'NOT_STARTED') return <Chip size="small" variant="outlined" label="Not started" />;
  return (
    <Button size="small" onClick={() => onOpen(rota.rotaId)} sx={{ textTransform: 'none', minWidth: 0, p: 0 }}>
      {percentFilled(rota)} filled, {rota.open} open
    </Button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { canManagePeople } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axiosInstance.get(API_ENDPOINTS.dashboard)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.error || 'Failed to load the dashboard'));
  }, []);

  if (error) return <Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert></Box>;
  if (!data) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}><CircularProgress /></Box>;

  const { today, currentPeriod, nextPeriod, regions } = data;
  const openRota = (id) => navigate(`/schedules?id=${id}`);
  const openPayCycle = () => navigate('/paycycleSchedule');
  const notStarted = regions.filter((r) => r.next.status === 'NOT_STARTED');

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {longDate(today)}
        {currentPeriod && ` · ${periodName(currentPeriod)} ends ${longDate(currentPeriod.endDate)}`}
        {nextPeriod && ` · ${periodName(nextPeriod)} starts in ${plural(daysBetween(today, nextPeriod.startDate), 'day')}`}
      </Typography>

      <Typography variant="h6" gutterBottom>Needs attention</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} md={4} lg={2}>
          <AttentionCard count={data.pendingRequests} label="Shift requests" hint="Waiting for a decision"
            onClick={() => navigate('/shift-requests')} />
        </Grid>
        <Grid item xs={6} md={4} lg={2}>
          <AttentionCard count={notStarted.length} label="Regions with no rota" hint={`For ${periodName(nextPeriod, 'the next period')}`}
            onClick={openPayCycle} />
        </Grid>
        <Grid item xs={6} md={4} lg={2}>
          <AttentionCard count={sum(regions, (r) => r.next.open)} label="Open shifts" hint="In next period's rotas" onClick={openPayCycle} />
        </Grid>
        <Grid item xs={6} md={4} lg={2}>
          <AttentionCard count={sum(regions, (r) => r.belowContract)} label="Below contract" hint="Permanent carers, next period" />
        </Grid>
        <Grid item xs={6} md={4} lg={2}>
          <AttentionCard count={sum(regions, (r) => r.pinsNotApplied)} label="Pins not applied" hint="In next period's rotas"
            onClick={canManagePeople ? () => navigate('/standing-pins') : undefined} />
        </Grid>
        <Grid item xs={6} md={4} lg={2}>
          <AttentionCard count={data.namesToFix} label="Names to fix" hint="On carers' service lists"
            onClick={canManagePeople ? () => navigate('/services') : undefined} />
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom>Rotas by region</Typography>
      {data.solvesRunning > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>{plural(data.solvesRunning, 'solve')} running or waiting.</Alert>
      )}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Region</strong></TableCell>
              <TableCell align="right"><strong>Carers</strong></TableCell>
              <TableCell><strong>{periodName(currentPeriod, 'This period')}</strong></TableCell>
              <TableCell><strong>{periodName(nextPeriod, 'Next period')}</strong></TableCell>
              <TableCell align="right"><strong>Below contract</strong></TableCell>
              <TableCell align="right"><strong>Pins not applied</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {regions.map((r) => (
              <TableRow key={r.region} hover>
                <TableCell>{r.region}</TableCell>
                <TableCell align="right">{r.activeCarers}</TableCell>
                <TableCell><RotaCell rota={r.current} onOpen={openRota} /></TableCell>
                <TableCell><RotaCell rota={r.next} onOpen={openRota} /></TableCell>
                <TableCell align="right">{r.next.rotaId ? r.belowContract : '—'}</TableCell>
                <TableCell align="right">{r.next.rotaId ? r.pinsNotApplied : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
