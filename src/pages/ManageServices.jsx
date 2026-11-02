import { useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Button, IconButton, Table, TableHead, TableBody, TableRow,
  TableCell, TableContainer, Chip, Tooltip, CircularProgress, Alert, Snackbar, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select,
  MenuItem, Switch, FormControlLabel, Grid, Tabs, Tab,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, HomeWork as HomeWorkIcon, DriveFileRenameOutline as RenameIcon,
} from '@mui/icons-material';
import axiosInstance from '../components/axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';
import { useAuth } from '../contexts/AuthContext';
import ServiceBulkDialog from '../components/ServiceBulkDialog';
import ServiceNamesToFix from '../components/ServiceNamesToFix';
import ServiceBulkHistory from '../components/ServiceBulkHistory';

const blankService = () => ({ id: null, name: '', location: '', parentId: '', mobizioId: '', active: true });

const rotaName = (s) => s.staffrotaLocation || s.name;

export default function ManageServices() {
  const { canManagePeople } = useAuth();

  const [regions, setRegions] = useState([]);
  const [region, setRegion] = useState('');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(blankService());
  const [rotaNameLocked, setRotaNameLocked] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tab, setTab] = useState('services');
  const [bulk, setBulk] = useState(null); // { name, initial } while the bulk dialog is open
  const [bulkRun, setBulkRun] = useState(0); // bumps to reload the tabs after an update

  const showToast = (message, severity = 'success') => setToast({ message, severity });

  useEffect(() => {
    axiosInstance.get(`${API_ENDPOINTS.shiftTemplates}/regions`).then((r) => setRegions(r.data || [])).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await axiosInstance.get(API_ENDPOINTS.manageServices, { params: { region } });
      setServices(r.data || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (region) load(); else setServices([]);
  }, [region, bulkRun]);

  // Each service followed by its flats, so the table reads like the dropdowns.
  const rows = useMemo(() => {
    const flatsOf = (id) => services.filter((s) => s.parentId === id);
    const known = new Set(services.map((s) => s.id));
    return services
      .filter((s) => !s.parentId || !known.has(s.parentId))
      .flatMap((s) => [s, ...flatsOf(s.id)]);
  }, [services]);

  const parentOf = (s) => services.find((p) => p.id === s.parentId);
  const hasFlats = form.id != null && services.some((s) => s.parentId === form.id);
  // One level only: flats can't take flats, and a service can't sit under itself.
  const parentChoices = services
    .filter((s) => !s.parentId && s.id !== form.id && (s.active || s.id === form.parentId))
    .sort((a, b) => rotaName(a).localeCompare(rotaName(b)));

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const bulkDone = () => {
    showToast(`Updated ${bulk.name}`);
    setBulk(null);
    setBulkRun((n) => n + 1);
  };

  const undone = (name) => {
    showToast(`Undid the update to ${name}`);
    setBulkRun((n) => n + 1);
  };

  const openCreate = () => {
    setForm(blankService());
    setRotaNameLocked(false);
    setFormOpen(true);
  };

  const openEdit = (s) => {
    setForm({
      id: s.id,
      name: s.name ?? '',
      location: s.staffrotaLocation ?? '',
      parentId: s.parentId ?? '',
      mobizioId: s.mobizioId ?? '',
      active: !!s.active,
    });
    setRotaNameLocked(!!s.staffrotaLocation);
    setFormOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) { showToast('Enter a service name', 'error'); return; }
    if (!form.location.trim()) { showToast('Enter a rota name', 'error'); return; }

    const payload = {
      region,
      name: form.name.trim(),
      location: form.location.trim(),
      parentId: form.parentId === '' ? null : form.parentId,
      mobizioId: form.mobizioId.trim() || null,
      active: form.active,
    };
    setSaving(true);
    try {
      if (form.id == null) {
        await axiosInstance.post(API_ENDPOINTS.manageServices, payload);
        showToast(`Added ${payload.location}`);
      } else {
        await axiosInstance.put(API_ENDPOINTS.manageServiceById(form.id), payload);
        showToast(`Saved ${payload.location}`);
      }
      setFormOpen(false);
      await load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <HomeWorkIcon />
          <Typography variant="h5">Services</Typography>
          <Box sx={{ flexGrow: 1 }} />
          {canManagePeople && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} disabled={!region}>Add service</Button>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          To put a flat under its building, edit the flat and choose the building in "Part of". The link only
          groups them in dropdowns: it does not change any rota. After adding a flat, set up its shift templates
          and add it to carers' services. To change a name everywhere, use the rename button on its row, or fix
          it from the Names to fix tab.
        </Typography>

        <FormControl size="small" sx={{ minWidth: 240, mb: 2 }}>
          <InputLabel>Region</InputLabel>
          <Select label="Region" value={region} onChange={(e) => setRegion(e.target.value)}>
            {regions.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </Select>
        </FormControl>

        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab value="services" label="Services" />
          <Tab value="names" label="Names to fix" />
          <Tab value="history" label="Update history" />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {tab === 'names' && (
          <ServiceNamesToFix region={region} refreshKey={bulkRun} canEdit={canManagePeople}
            onFix={(name, initial) => setBulk({ name, initial })} />
        )}
        {tab === 'history' && (
          <ServiceBulkHistory region={region} refreshKey={bulkRun} canEdit={canManagePeople}
            onUndone={undone} onError={(m) => showToast(m, 'error')} />
        )}
        {tab === 'services' && (loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Service</strong></TableCell>
                  <TableCell><strong>Rota name</strong></TableCell>
                  <TableCell><strong>Part of</strong></TableCell>
                  <TableCell><strong>People Planner ID</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      {region ? 'No services in this region.' : 'Choose a region.'}
                    </Typography>
                  </TableCell></TableRow>
                )}
                {rows.map((s) => (
                  <TableRow key={s.id} hover sx={{ opacity: s.active ? 1 : 0.55 }}>
                    <TableCell sx={{ pl: s.parentId ? 5 : 2 }}>{s.name}</TableCell>
                    <TableCell>{s.staffrotaLocation
                      ? <code>{s.staffrotaLocation}</code>
                      : <Typography variant="caption" color="text.secondary">Not set</Typography>}</TableCell>
                    <TableCell>{parentOf(s) ? rotaName(parentOf(s)) : '—'}</TableCell>
                    <TableCell>{s.mobizioId || '—'}</TableCell>
                    <TableCell>
                      <Chip label={s.active ? 'Active' : 'Inactive'} color={s.active ? 'success' : 'default'}
                        size="small" variant={s.active ? 'filled' : 'outlined'} />
                    </TableCell>
                    <TableCell align="right">
                      {canManagePeople ? (
                        <>
                          <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(s)}>
                            <EditIcon fontSize="small" /></IconButton></Tooltip>
                          {s.staffrotaLocation && (
                            <Tooltip title="Rename, merge or remove">
                              <IconButton size="small" onClick={() => setBulk({ name: s.staffrotaLocation, initial: null })}>
                                <RenameIcon fontSize="small" /></IconButton>
                            </Tooltip>
                          )}
                        </>
                      ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ))}
      </Paper>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form.id == null ? 'Add service' : `Edit ${form.name}`}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField label="Service name" fullWidth size="small" value={form.name}
                onChange={(e) => setField('name', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Rota name" fullWidth size="small" value={form.location}
                disabled={rotaNameLocked}
                onChange={(e) => setField('location', e.target.value)}
                helperText={rotaNameLocked
                  ? 'Cannot be changed here: shifts and carers’ services refer to it'
                  : 'The name on rotas and carers’ services. Set once. No commas or colons.'} />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small" disabled={hasFlats}>
                <InputLabel shrink>Part of</InputLabel>
                <Select label="Part of" notched displayEmpty value={form.parentId}
                  onChange={(e) => setField('parentId', e.target.value)}>
                  <MenuItem value="">None (top-level service)</MenuItem>
                  {parentChoices.map((s) => <MenuItem key={s.id} value={s.id}>{rotaName(s)}</MenuItem>)}
                </Select>
              </FormControl>
              {hasFlats && (
                <Typography variant="caption" color="text.secondary">
                  This service has flats, so it can&apos;t sit under another service.
                </Typography>
              )}
            </Grid>
            <Grid item xs={12}>
              <TextField label="People Planner ID" fullWidth size="small" value={form.mobizioId}
                onChange={(e) => setField('mobizioId', e.target.value)}
                helperText="Optional, for example 2-1784. Used to match People Planner history." />
            </Grid>
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
            {form.id == null ? 'Add' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <ServiceBulkDialog open={!!bulk} region={region} name={bulk?.name} initial={bulk?.initial}
        locations={services.filter((s) => s.active).map(rotaName)}
        onClose={() => setBulk(null)} onDone={bulkDone} />

      <Snackbar open={!!toast} autoHideDuration={4500} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>{toast.message}</Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
