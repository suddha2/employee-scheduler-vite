import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, TextField, Select, MenuItem, Switch, IconButton, Tooltip, Chip, Alert,
  CircularProgress, Snackbar, Button,
} from '@mui/material';
import { Save as SaveIcon, Tune as TuneIcon, Restore as RestoreIcon } from '@mui/icons-material';
import axiosInstance from '../components/axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';
import { useAuth } from '../contexts/AuthContext';

// Compare an editable row to its saved baseline so we only enable Save when it changed.
const constraintDirty = (r, base) =>
  r.scoreWeight !== base.scoreWeight || r.constraintType !== base.constraintType || r.enabled !== base.enabled;

export default function SolverSettings() {
  const { canManagePeople } = useAuth();
  const readOnly = !canManagePeople;

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Editable rows + a baseline copy keyed by id for dirty detection.
  const [constraints, setConstraints] = useState([]);
  const [cBase, setCBase] = useState({});
  const [tuning, setTuning] = useState([]);
  const [tBase, setTBase] = useState({});
  const [savingId, setSavingId] = useState(null);

  const showToast = (message, severity = 'success') => setToast({ message, severity });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, t] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.solverConstraints),
        axiosInstance.get(API_ENDPOINTS.solverTuning),
      ]);
      const cRows = (c.data || []).map((x) => ({ ...x }));
      const tRows = (t.data || []).map((x) => ({ ...x }));
      setConstraints(cRows);
      setCBase(Object.fromEntries(cRows.map((x) => [x.constraintName, { ...x }])));
      setTuning(tRows);
      setTBase(Object.fromEntries(tRows.map((x) => [x.settingKey, { ...x }])));
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message
        || 'Failed to load solver settings. Are the constraint_setting / solver_tuning tables seeded?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setC = (name, field, value) =>
    setConstraints((rows) => rows.map((r) => (r.constraintName === name ? { ...r, [field]: value } : r)));
  const setT = (key, value) =>
    setTuning((rows) => rows.map((r) => (r.settingKey === key ? { ...r, intValue: value } : r)));

  const resetC = (name) =>
    setConstraints((rows) => rows.map((r) => (r.constraintName === name ? { ...cBase[name] } : r)));
  const resetT = (key) =>
    setTuning((rows) => rows.map((r) => (r.settingKey === key ? { ...tBase[key] } : r)));

  const saveConstraint = async (r) => {
    const weight = Number(r.scoreWeight);
    if (!Number.isFinite(weight) || weight < 0) { showToast('Weight must be 0 or more', 'error'); return; }
    setSavingId(r.constraintName);
    try {
      const { data } = await axiosInstance.put(API_ENDPOINTS.solverConstraintByName(r.constraintName), {
        scoreWeight: weight, constraintType: r.constraintType, enabled: r.enabled,
      });
      setCBase((b) => ({ ...b, [r.constraintName]: { ...data } }));
      setConstraints((rows) => rows.map((x) => (x.constraintName === r.constraintName ? { ...data } : x)));
      showToast(`Saved “${r.constraintName}” — applies to the next solve`);
    } catch (e) {
      showToast(e.response?.data?.error || 'Save failed', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const saveTuning = async (r) => {
    const value = Number(r.intValue);
    if (!Number.isInteger(value) || value < 0) { showToast('Value must be a whole number, 0 or more', 'error'); return; }
    setSavingId(r.settingKey);
    try {
      const { data } = await axiosInstance.put(API_ENDPOINTS.solverTuningByKey(r.settingKey), { intValue: value });
      setTBase((b) => ({ ...b, [r.settingKey]: { ...data } }));
      setTuning((rows) => rows.map((x) => (x.settingKey === r.settingKey ? { ...data } : x)));
      showToast(`Saved “${r.settingKey}” — applied to the running solver`);
    } catch (e) {
      showToast(e.response?.data?.error || 'Save failed', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const enabledCount = constraints.filter((c) => c.enabled).length;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <TuneIcon />
          <Typography variant="h5">Solver Settings</Typography>
          <Box sx={{ flexGrow: 1 }} />
          {readOnly && <Chip size="small" label="Read only" variant="outlined" />}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The rota’s levers. <strong>Constraints</strong> are the rules and how much each counts; turning one off,
          or setting its weight to 0, removes it from scoring. <strong>Tuning</strong> holds the numeric thresholds
          the rules compare against. Constraint changes apply to the next solve; tuning changes apply to the running
          solver immediately.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label={`Constraints${constraints.length ? ` (${enabledCount}/${constraints.length} on)` : ''}`} />
          <Tab label={`Tuning${tuning.length ? ` (${tuning.length})` : ''}`} />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : tab === 0 ? (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              A <strong>HARD</strong> constraint can make a period unsolvable if reality can’t satisfy it. Prefer
              SOFT with a high weight unless the rule is a true never-break.
            </Alert>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>On</strong></TableCell>
                    <TableCell><strong>Constraint</strong></TableCell>
                    <TableCell><strong>Severity</strong></TableCell>
                    <TableCell align="right"><strong>Weight</strong></TableCell>
                    <TableCell align="right"><strong></strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {constraints.map((r) => {
                    const dirty = cBase[r.constraintName] && constraintDirty(r, cBase[r.constraintName]);
                    return (
                      <TableRow key={r.constraintName} hover sx={{ opacity: r.enabled ? 1 : 0.6 }}>
                        <TableCell>
                          <Switch size="small" checked={!!r.enabled} disabled={readOnly}
                            onChange={(e) => setC(r.constraintName, 'enabled', e.target.checked)} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{r.constraintName}</Typography>
                          {r.description && (
                            <Typography variant="caption" color="text.secondary">{r.description}</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select size="small" value={r.constraintType} disabled={readOnly}
                            onChange={(e) => setC(r.constraintName, 'constraintType', e.target.value)}
                            sx={{ minWidth: 96 }}>
                            <MenuItem value="SOFT">SOFT</MenuItem>
                            <MenuItem value="HARD">HARD</MenuItem>
                          </Select>
                          {r.constraintType === 'HARD' && (
                            <Chip size="small" color="error" variant="outlined" label="hard" sx={{ ml: 1 }} />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <TextField type="number" size="small" value={r.scoreWeight} disabled={readOnly}
                            onChange={(e) => setC(r.constraintName, 'scoreWeight', e.target.value)}
                            inputProps={{ min: 0, style: { width: 120, textAlign: 'right' } }} />
                        </TableCell>
                        <TableCell align="right">
                          {!readOnly && (
                            <>
                              <Tooltip title="Revert"><span>
                                <IconButton size="small" disabled={!dirty} onClick={() => resetC(r.constraintName)}>
                                  <RestoreIcon fontSize="small" />
                                </IconButton></span></Tooltip>
                              <Tooltip title="Save"><span>
                                <IconButton size="small" color="primary" disabled={!dirty || savingId === r.constraintName}
                                  onClick={() => saveConstraint(r)}>
                                  {savingId === r.constraintName ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
                                </IconButton></span></Tooltip>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Setting</strong></TableCell>
                  <TableCell align="right"><strong>Value</strong></TableCell>
                  <TableCell align="right"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tuning.map((r) => {
                  const dirty = tBase[r.settingKey] && Number(r.intValue) !== Number(tBase[r.settingKey].intValue);
                  return (
                    <TableRow key={r.settingKey} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{r.settingKey}</Typography>
                        {r.description && (
                          <Typography variant="caption" color="text.secondary">{r.description}</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <TextField type="number" size="small" value={r.intValue} disabled={readOnly}
                          onChange={(e) => setT(r.settingKey, e.target.value)}
                          inputProps={{ min: 0, style: { width: 100, textAlign: 'right' } }} />
                      </TableCell>
                      <TableCell align="right">
                        {!readOnly && (
                          <>
                            <Tooltip title="Revert"><span>
                              <IconButton size="small" disabled={!dirty} onClick={() => resetT(r.settingKey)}>
                                <RestoreIcon fontSize="small" />
                              </IconButton></span></Tooltip>
                            <Tooltip title="Save"><span>
                              <IconButton size="small" color="primary" disabled={!dirty || savingId === r.settingKey}
                                onClick={() => saveTuning(r)}>
                                {savingId === r.settingKey ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
                              </IconButton></span></Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Box sx={{ mt: 2 }}>
          <Button size="small" onClick={load} disabled={loading}>Reload</Button>
        </Box>
      </Paper>

      <Snackbar open={!!toast} autoHideDuration={4500} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>{toast.message}</Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
