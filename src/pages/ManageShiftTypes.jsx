import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, IconButton, Table, TableHead, TableBody, TableRow,
  TableCell, TableContainer, Chip, Tooltip, CircularProgress, Alert, Snackbar, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select,
  MenuItem, Switch, FormControlLabel, Stack, Grid, Divider,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Block as BlockIcon,
  CheckCircleOutline as ActivateIcon, Category as CategoryIcon,
} from '@mui/icons-material';
import axiosInstance from '../components/axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';
import { useAuth } from '../contexts/AuthContext';

const RATE_BASES = ['HOURLY', 'DAILY', 'FLAT'];

// A fresh row for the "add" dialog — mirrors the shift_type defaults.
const blankType = () => ({
  code: '',
  displayName: '',
  active: true,
  rate: '',
  defaultRateBasis: 'HOURLY',
  requiredSkill: '',
  maxHoursPerDay: '',
  maxPerWeek: '',
  defaultIsFollower: false,
  defaultPairsWith: '',
  countsAsWork: true,
  countsTowardWeeklyCap: true,
  countsAsLocationCoverage: true,
  paidHours: true,
  mineable: true,
});

// Behaviour flags rendered as a row of switches in the dialog.
const FLAGS = [
  ['countsAsWork', 'Counts as work', 'Subject to hourly/monthly limits; a non-work type (e.g. sleep-in) is exempt.'],
  ['countsTowardWeeklyCap', 'Counts toward weekly cap', 'Included in the 5/6-shifts-per-week soft cap.'],
  ['countsAsLocationCoverage', 'Provides location coverage', 'Fills a service’s cover requirement.'],
  ['paidHours', 'Paid hours', 'Included in projected pay hours.'],
  ['mineable', 'Mineable', 'Used when learning patterns from history.'],
];

const money = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

export default function ManageShiftTypes() {
  // Config that drives rates + solver behaviour — same bucket as shift templates.
  const { canManagePeople } = useAuth();

  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [showInactive, setShowInactive] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
  const [form, setForm] = useState(blankType());
  const [saving, setSaving] = useState(false);

  const showToast = (message, severity = 'success') => setToast({ message, severity });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await axiosInstance.get(API_ENDPOINTS.shiftTypes);
      setTypes(r.data || []);
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Failed to load shift types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setFormMode('create');
    setForm(blankType());
    setFormOpen(true);
  };

  const openEdit = (t) => {
    setFormMode('edit');
    setForm({
      code: t.code,
      displayName: t.displayName ?? '',
      active: !!t.active,
      rate: t.rate ?? '',
      defaultRateBasis: t.defaultRateBasis ?? 'HOURLY',
      requiredSkill: t.requiredSkill ?? '',
      maxHoursPerDay: t.maxHoursPerDay ?? '',
      maxPerWeek: t.maxPerWeek ?? '',
      defaultIsFollower: !!t.defaultIsFollower,
      defaultPairsWith: t.defaultPairsWith ?? '',
      countsAsWork: !!t.countsAsWork,
      countsTowardWeeklyCap: !!t.countsTowardWeeklyCap,
      countsAsLocationCoverage: !!t.countsAsLocationCoverage,
      paidHours: !!t.paidHours,
      mineable: !!t.mineable,
    });
    setFormOpen(true);
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    // Client-side mirror of the server checks, for a friendlier message.
    if (formMode === 'create') {
      const code = (form.code || '').trim().toUpperCase();
      if (!/^[A-Z0-9_]{2,40}$/.test(code)) {
        showToast('Code must be 2–40 chars: UPPER_CASE letters, digits or underscore', 'error');
        return;
      }
    }
    if (!form.displayName?.trim()) { showToast('Display name is required', 'error'); return; }
    if (form.rate !== '' && Number(form.rate) < 0) { showToast('Rate cannot be negative', 'error'); return; }
    if (form.defaultIsFollower && !form.defaultPairsWith?.trim()) {
      showToast('A follower type must name the leader it pairs with', 'error'); return;
    }

    const payload = {
      code: (form.code || '').trim().toUpperCase(),
      displayName: form.displayName.trim(),
      active: form.active,
      rate: money(form.rate),
      defaultRateBasis: form.defaultRateBasis,
      requiredSkill: form.requiredSkill?.trim() || null,
      maxHoursPerDay: num(form.maxHoursPerDay),
      maxPerWeek: num(form.maxPerWeek),
      defaultIsFollower: form.defaultIsFollower,
      defaultPairsWith: form.defaultPairsWith?.trim() || null,
      countsAsWork: form.countsAsWork,
      countsTowardWeeklyCap: form.countsTowardWeeklyCap,
      countsAsLocationCoverage: form.countsAsLocationCoverage,
      paidHours: form.paidHours,
      mineable: form.mineable,
    };

    setSaving(true);
    try {
      if (formMode === 'create') {
        await axiosInstance.post(API_ENDPOINTS.shiftTypes, payload);
        showToast(`Created ${payload.code}`);
      } else {
        await axiosInstance.put(API_ENDPOINTS.shiftTypeByCode(payload.code), payload);
        showToast(`Saved ${payload.code}`);
      }
      setFormOpen(false);
      await load();
    } catch (e) {
      const status = e.response?.status;
      showToast(e.response?.data?.error || e.response?.data?.message
        || (status === 409 ? 'A type with that code already exists' : 'Save failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (t) => {
    if (!window.confirm(`Deactivate shift type "${t.displayName || t.code}"? Existing templates keep their code but it won’t appear as a choice.`)) return;
    try {
      await axiosInstance.delete(API_ENDPOINTS.shiftTypeByCode(t.code));
      showToast(`Deactivated ${t.code}`);
      await load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to deactivate', 'error');
    }
  };

  const reactivate = async (t) => {
    try {
      await axiosInstance.put(API_ENDPOINTS.shiftTypeByCode(t.code), { ...t, active: true });
      showToast(`Reactivated ${t.code}`);
      await load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to reactivate', 'error');
    }
  };

  const rateLabel = (t) => {
    if (t.rate === null || t.rate === undefined) return <Typography variant="caption" color="text.secondary">rate card</Typography>;
    const basis = { HOURLY: '/hr', DAILY: '/day', FLAT: ' flat' }[t.defaultRateBasis] || '';
    return <span>£{Number(t.rate).toFixed(2)}{basis}</span>;
  };

  const rows = showInactive ? types : types.filter((t) => t.active);

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CategoryIcon />
          <Typography variant="h5">Shift Types</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant={showInactive ? 'contained' : 'outlined'} size="small"
            onClick={() => setShowInactive((v) => !v)}>
            {showInactive ? 'Showing all' : 'Active only'}
          </Button>
          {canManagePeople && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add type</Button>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          A shift type is a label plus behaviour defaults. Rate is the type’s own tag — a flat £/hr, £/day
          or one-off amount that overrides the rate card (blank = use the rate card). A non-standard rate
          means its own type. Changes take effect on the next solve and cost report.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Code</strong></TableCell>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Rate</strong></TableCell>
                  <TableCell align="center"><strong>Max hrs/day</strong></TableCell>
                  <TableCell align="center"><strong>Max/week</strong></TableCell>
                  <TableCell><strong>Requires skill</strong></TableCell>
                  <TableCell><strong>Pairing</strong></TableCell>
                  <TableCell><strong>Behaviour</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={10} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>No shift types.</Typography>
                  </TableCell></TableRow>
                )}
                {rows.map((t) => (
                  <TableRow key={t.code} hover sx={{ opacity: t.active ? 1 : 0.55 }}>
                    <TableCell><code>{t.code}</code></TableCell>
                    <TableCell>{t.displayName}</TableCell>
                    <TableCell>{rateLabel(t)}</TableCell>
                    <TableCell align="center">{t.maxHoursPerDay ?? '—'}</TableCell>
                    <TableCell align="center">{t.maxPerWeek ?? '—'}</TableCell>
                    <TableCell>{t.requiredSkill
                      ? <Chip label={t.requiredSkill} size="small" color="info" variant="outlined" />
                      : <Typography variant="caption" color="text.secondary">—</Typography>}</TableCell>
                    <TableCell>
                      {t.defaultIsFollower
                        ? <Chip size="small" label={`follows ${t.defaultPairsWith || '?'}`} color="secondary" variant="outlined" />
                        : <Typography variant="caption" color="text.secondary">—</Typography>}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {!t.countsAsWork && <Chip size="small" label="non-work" />}
                        {!t.countsTowardWeeklyCap && <Chip size="small" label="off-cap" />}
                        {!t.countsAsLocationCoverage && <Chip size="small" label="no-cover" />}
                        {!t.paidHours && <Chip size="small" label="unpaid" />}
                        {!t.mineable && <Chip size="small" label="no-mine" />}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={t.active ? 'Active' : 'Inactive'} color={t.active ? 'success' : 'default'}
                        size="small" variant={t.active ? 'filled' : 'outlined'} />
                    </TableCell>
                    <TableCell align="right">
                      {canManagePeople ? (
                        <>
                          <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(t)}>
                            <EditIcon fontSize="small" /></IconButton></Tooltip>
                          {t.active ? (
                            <Tooltip title="Deactivate"><IconButton size="small" color="error" onClick={() => deactivate(t)}>
                              <BlockIcon fontSize="small" /></IconButton></Tooltip>
                          ) : (
                            <Tooltip title="Reactivate"><IconButton size="small" color="success" onClick={() => reactivate(t)}>
                              <ActivateIcon fontSize="small" /></IconButton></Tooltip>
                          )}
                        </>
                      ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Create / edit dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{formMode === 'create' ? 'Add shift type' : `Edit ${form.code}`}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={5}>
              <TextField label="Code" fullWidth size="small" value={form.code}
                disabled={formMode === 'edit'}
                onChange={(e) => setField('code', e.target.value.toUpperCase())}
                helperText={formMode === 'create' ? 'UPPER_CASE, unique, permanent' : 'Cannot be changed'} />
            </Grid>
            <Grid item xs={12} sm={7}>
              <TextField label="Display name" fullWidth size="small" value={form.displayName}
                onChange={(e) => setField('displayName', e.target.value)} />
            </Grid>

            <Grid item xs={12}><Divider textAlign="left"><Typography variant="caption">Rate</Typography></Divider></Grid>
            <Grid item xs={6} sm={5}>
              <TextField label="Rate (£)" type="number" fullWidth size="small" value={form.rate}
                onChange={(e) => setField('rate', e.target.value)}
                inputProps={{ min: 0, step: '0.01' }}
                helperText="Blank = use rate card" />
            </Grid>
            <Grid item xs={6} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Basis</InputLabel>
                <Select label="Basis" value={form.defaultRateBasis}
                  onChange={(e) => setField('defaultRateBasis', e.target.value)}>
                  {RATE_BASES.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}><Divider textAlign="left"><Typography variant="caption">Limits &amp; eligibility</Typography></Divider></Grid>
            <Grid item xs={6} sm={4}>
              <TextField label="Max hrs/day" type="number" fullWidth size="small" value={form.maxHoursPerDay}
                onChange={(e) => setField('maxHoursPerDay', e.target.value)}
                inputProps={{ min: 1 }} helperText="Blank = no cap" />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField label="Max/week" type="number" fullWidth size="small" value={form.maxPerWeek}
                onChange={(e) => setField('maxPerWeek', e.target.value)}
                inputProps={{ min: 1 }} helperText="Blank = no cap" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Requires skill" fullWidth size="small" value={form.requiredSkill}
                onChange={(e) => setField('requiredSkill', e.target.value)}
                helperText="Auto-tagged on templates" />
            </Grid>

            <Grid item xs={12}><Divider textAlign="left"><Typography variant="caption">Pairing</Typography></Divider></Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={
                <Switch checked={form.defaultIsFollower}
                  onChange={(e) => setField('defaultIsFollower', e.target.checked)} />
              } label="Follower (mirrors a leader)" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Pairs with (leader code)" fullWidth size="small" value={form.defaultPairsWith}
                disabled={!form.defaultIsFollower}
                onChange={(e) => setField('defaultPairsWith', e.target.value.toUpperCase())}
                helperText="e.g. SLEEP_IN pairs with LONG_DAY" />
            </Grid>

            <Grid item xs={12}><Divider textAlign="left"><Typography variant="caption">Behaviour</Typography></Divider></Grid>
            {FLAGS.map(([key, label, hint]) => (
              <Grid item xs={12} sm={6} key={key}>
                <Tooltip title={hint} placement="top-start">
                  <FormControlLabel control={
                    <Switch checked={!!form[key]} onChange={(e) => setField(key, e.target.checked)} />
                  } label={label} />
                </Tooltip>
              </Grid>
            ))}

            <Grid item xs={12}>
              <FormControlLabel control={
                <Switch checked={form.active} onChange={(e) => setField('active', e.target.checked)} />
              } label="Active (offered as a choice)" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving}
            startIcon={saving ? <CircularProgress size={18} /> : null}>
            {formMode === 'create' ? 'Create' : 'Save'}
          </Button>
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
