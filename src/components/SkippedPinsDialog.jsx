import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Table, TableHead, TableBody, TableRow,
  TableCell, Typography, Chip, Box, Alert } from '@mui/material';
import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';
import { useAuth } from '../contexts/AuthContext';
import { fmtDate } from '../utils/dates';

/**
 * Standing pins the solver did not apply when this rota was generated, and why (carer has
 * left, wrong gender, 7th day in a row, clash). Fix or remove these pins so they stop
 * repeating every period.
 */
export default function SkippedPinsDialog({ open, onClose, pins }) {
  const { canManagePeople } = useAuth();
  const [state, setState] = useState({}); // skipped pin id -> 'removed' | 'gone'
  const [error, setError] = useState(null);

  const removePin = async (p) => {
    setError(null);
    try {
      const r = await axiosInstance.post(API_ENDPOINTS.standingPinRemoveSkipped(p.id));
      setState((s) => ({ ...s, [p.id]: r.data.removed ? 'removed' : 'gone' }));
    } catch (e) {
      setError(e.response?.data?.error || 'Remove failed');
    }
  };

  const byReason = (pins || []).reduce((m, p) => m.set(p.reason, (m.get(p.reason) || 0) + 1), new Map());
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Pins not applied ({(pins || []).length})</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          These standing pins broke a rule, so the solver left the shift for an eligible carer.
          Update or remove the pin so it stops repeating every period.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {[...byReason].map(([reason, n]) => (
            <Chip key={reason} size="small" color="warning" variant="outlined" label={`${reason}: ${n}`} />
          ))}
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Carer</TableCell>
              <TableCell>Service · shift</TableCell>
              <TableCell>Why it wasn't applied</TableCell>
              {canManagePeople && <TableCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {(pins || []).map((p) => (
              <TableRow key={p.id}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(p.shiftDate)}</TableCell>
                <TableCell>{p.employeeName || `#${p.employeeId}`}</TableCell>
                <TableCell>{p.location} · {(p.shiftType || '').replaceAll('_', ' ')}</TableCell>
                <TableCell>{p.reason}</TableCell>
                {canManagePeople && (
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {state[p.id] === 'removed' ? <Typography variant="caption" color="success.main">Removed</Typography>
                      : state[p.id] === 'gone' ? <Typography variant="caption" color="text.secondary">Pin already gone</Typography>
                        : <Button size="small" color="error" onClick={() => removePin(p)}>Remove pin</Button>}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
