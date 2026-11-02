import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';

const whoLists = (names) => (names.length === 0 ? '0' : (
  <Tooltip title={names.join(', ')}><span style={{ textDecoration: 'underline dotted' }}>{names.length}</span></Tooltip>
));

// Names on carers' lists that match no rota location, or that a carer lists twice.
export default function ServiceNamesToFix({ region, refreshKey, canEdit, onFix }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!region) { setRows([]); return; }
    setLoading(true);
    setError(null);
    axiosInstance.get(API_ENDPOINTS.serviceNamesToFix, { params: { region } })
      .then((r) => setRows(r.data || []))
      .catch((e) => setError(e.response?.data?.error || 'Failed to load names'))
      .finally(() => setLoading(false));
  }, [region, refreshKey]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (rows.length === 0) {
    return <Alert severity="success">{region ? 'Every name on carers’ lists matches a rota location.' : 'Choose a region.'}</Alert>;
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell><strong>Name on carers&apos; lists</strong></TableCell>
            <TableCell><strong>Problem</strong></TableCell>
            <TableCell><strong>Likely name</strong></TableCell>
            <TableCell align="center"><strong>Services</strong></TableCell>
            <TableCell align="center"><strong>Restricted</strong></TableCell>
            <TableCell align="right"><strong>Actions</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.name} hover>
              <TableCell><code>{r.name}</code></TableCell>
              <TableCell>{r.problem}</TableCell>
              <TableCell>{r.suggestion || '—'}</TableCell>
              <TableCell align="center">{whoLists(r.carerServices)}</TableCell>
              <TableCell align="center">{whoLists(r.carerRestrictions)}</TableCell>
              <TableCell align="right">
                {canEdit
                  ? <Button size="small" onClick={() => onFix(r.name, { action: r.action, newName: r.suggestion || '' })}>Fix</Button>
                  : <Typography variant="caption" color="text.secondary">—</Typography>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
