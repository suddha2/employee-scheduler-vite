import { useEffect, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, TextField, Typography,
} from '@mui/material';
import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';

const ACTIONS = [
  ['RENAME', 'Rename', 'Change this name everywhere it is used.'],
  ['MERGE', 'Merge into another location', 'Move everything onto an existing location. A carer listing both keeps the higher weight.'],
  ['REMOVE', 'Remove from carers', 'Take this name off carers’ services and restricted lists. Shift templates are not touched.'],
  ['CLOSE', 'Close the house', 'For a house that has moved or shut: take it off carers’ lists and switch off its shift templates, so new rotas have no shifts there. Past rotas are kept. Undo brings everything back.'],
];

const needsNewName = (action) => action !== 'REMOVE' && action !== 'CLOSE';

// Rename, merge or remove one service name. Nothing is saved until the user has seen the preview.
export default function ServiceBulkDialog({ open, region, name, initial, locations, onClose, onDone }) {
  const [action, setAction] = useState('RENAME');
  const [newName, setNewName] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAction(initial?.action || 'RENAME');
    setNewName(initial?.newName || '');
    setPreview(null);
    setError(null);
  }, [open, name, initial]);

  const request = () => ({ region, action, name, newName: needsNewName(action) ? newName : null });

  const changeAction = (value) => { setAction(value); setPreview(null); setError(null); };
  const changeName = (value) => { setNewName(value || ''); setPreview(null); setError(null); };

  const runPreview = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await axiosInstance.post(API_ENDPOINTS.serviceBulkPreview, request());
      setPreview(r.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Preview failed');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await axiosInstance.post(API_ENDPOINTS.serviceBulk, request());
      onDone();
    } catch (e) {
      setError(e.response?.data?.error || 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const summary = preview ? [
    action === 'CLOSE'
      ? [preview.templates, 'shift template switched off', 'shift templates switched off']
      : [preview.templates, 'shift template'],
    [preview.carerServices.length, 'carer service list'],
    [preview.carerRestrictions.length, 'carer restricted list'],
    [preview.services, 'service record'],
    [preview.patterns, 'working pattern'],
    [preview.publishLogs, 'publish log record'],
    [preview.history, 'house history row'],
  ].filter(([n]) => n > 0) : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Update {name}</DialogTitle>
      <DialogContent dividers>
        <FormControl sx={{ mb: 2 }}>
          <FormLabel>What do you want to do?</FormLabel>
          <RadioGroup value={action} onChange={(e) => changeAction(e.target.value)}>
            {ACTIONS.map(([value, label, hint]) => (
              <FormControlLabel key={value} value={value} control={<Radio size="small" />}
                label={<><Typography variant="body2">{label}</Typography>
                  <Typography variant="caption" color="text.secondary">{hint}</Typography></>} />
            ))}
          </RadioGroup>
        </FormControl>

        {action === 'RENAME' && (
          <TextField label="New name" fullWidth size="small" value={newName}
            onChange={(e) => changeName(e.target.value)} helperText="No commas or colons. At most 50 characters." />
        )}
        {action === 'MERGE' && (
          <Autocomplete options={locations} value={newName || null} onChange={(e, v) => changeName(v)}
            renderInput={(params) => <TextField {...params} label="Merge into" size="small" />} />
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        {preview && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info">
              This will change: {summary.map(([n, label, plural]) => `${n} ${n === 1 ? label : (plural || `${label}s`)}`).join(', ')}.
            </Alert>
            {preview.warnings.map((w) => <Alert key={w} severity="warning" sx={{ mt: 1 }}>{w}</Alert>)}
            {preview.carerServices.length > 0 && (
              <Typography variant="body2" sx={{ mt: 1 }}><strong>Carers&apos; services:</strong> {preview.carerServices.join(', ')}</Typography>
            )}
            {preview.carerRestrictions.length > 0 && (
              <Typography variant="body2" sx={{ mt: 1 }}><strong>Restricted lists:</strong> {preview.carerRestrictions.join(', ')}</Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {preview ? (
          <Button variant="contained" onClick={confirm} disabled={busy}
            startIcon={busy ? <CircularProgress size={18} /> : null}>Confirm</Button>
        ) : (
          <Button variant="contained" onClick={runPreview} disabled={busy || (needsNewName(action) && !newName.trim())}
            startIcon={busy ? <CircularProgress size={18} /> : null}>Preview</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
