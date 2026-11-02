import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';

const LABEL = { RENAME: 'Rename', MERGE: 'Merge', REMOVE: 'Remove' };

const when = (v) => (v ? new Date(v).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—');

// Past bulk updates for the region. Only the latest one still in force can be undone.
export default function ServiceBulkHistory({ region, refreshKey, canEdit, onUndone, onError }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!region) { setRows([]); return; }
    setLoading(true);
    setError(null);
    axiosInstance.get(API_ENDPOINTS.serviceBulk, { params: { region } })
      .then((r) => setRows(r.data || []))
      .catch((e) => setError(e.response?.data?.error || 'Failed to load history'))
      .finally(() => setLoading(false));
  }, [region, refreshKey]);

  const undo = async (row) => {
    if (!window.confirm(`Undo this update to ${row.name}? Every record it changed goes back to its old value.`)) return;
    try {
      await axiosInstance.post(API_ENDPOINTS.serviceBulkUndo(row.id));
      onUndone(row.name);
    } catch (e) {
      onError(e.response?.data?.error || 'Undo failed');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (rows.length === 0) return <Alert severity="info">{region ? 'No bulk updates in this region yet.' : 'Choose a region.'}</Alert>;

  const latest = rows.find((r) => !r.undone_at);

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell><strong>When</strong></TableCell>
            <TableCell><strong>By</strong></TableCell>
            <TableCell><strong>Action</strong></TableCell>
            <TableCell><strong>Name</strong></TableCell>
            <TableCell><strong>New name</strong></TableCell>
            <TableCell align="center"><strong>Records</strong></TableCell>
            <TableCell align="right"><strong>Status</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} hover sx={{ opacity: r.undone_at ? 0.55 : 1 }}>
              <TableCell>{when(r.changed_at)}</TableCell>
              <TableCell>{r.changed_by || '—'}</TableCell>
              <TableCell>{LABEL[r.action] || r.action}</TableCell>
              <TableCell><code>{r.name}</code></TableCell>
              <TableCell>{r.new_name ? <code>{r.new_name}</code> : '—'}</TableCell>
              <TableCell align="center">{r.row_count}</TableCell>
              <TableCell align="right">
                {r.undone_at ? <Chip size="small" variant="outlined" label="Undone" />
                  : canEdit && r.id === latest?.id ? <Button size="small" color="error" onClick={() => undo(r)}>Undo</Button>
                    : <Typography variant="caption" color="text.secondary">In force</Typography>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
