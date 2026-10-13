import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Table, TableHead, TableBody, TableRow,
  TableCell, Typography, Chip, Box } from '@mui/material';

/**
 * Standing pins the solver did not apply when this rota was generated, and why (carer has
 * left, wrong gender, 7th day in a row, clash). Fix or remove these pins so they stop
 * repeating every period.
 */
export default function SkippedPinsDialog({ open, onClose, pins }) {
  const byReason = (pins || []).reduce((m, p) => m.set(p.reason, (m.get(p.reason) || 0) + 1), new Map());
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Pins not applied ({(pins || []).length})</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          These standing pins broke a rule, so the solver left the shift for an eligible carer.
          Update or remove the pin so it stops repeating every period.
        </Typography>
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
            </TableRow>
          </TableHead>
          <TableBody>
            {(pins || []).map((p) => (
              <TableRow key={p.id}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{p.shiftDate}</TableCell>
                <TableCell>{p.employeeName || `#${p.employeeId}`}</TableCell>
                <TableCell>{p.location} · {(p.shiftType || '').replaceAll('_', ' ')}</TableCell>
                <TableCell>{p.reason}</TableCell>
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
