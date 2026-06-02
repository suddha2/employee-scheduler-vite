import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    IconButton,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableContainer,
    Chip,
    Tooltip,
    CircularProgress,
    Alert,
    Snackbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    FormControlLabel,
    Stack,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Key as KeyIcon,
    Block as BlockIcon,
    CheckCircleOutline as ActivateIcon,
    People as PeopleIcon,
} from '@mui/icons-material';

import {
    listUsers,
    createUser,
    updateUser,
    resetUserPassword,
    deactivateUser,
    ROLE_OPTIONS,
    ROLE_LABELS,
} from '../api/users';
import { useAuth } from '../contexts/AuthContext';

const ROLE_CHIP_COLOR = {
    ADMIN:       'error',
    OPS_MANAGER: 'warning',
    ROTA_EDITOR: 'info',
    READ_ONLY:   'default',
};

/** First (highest) role on a user, for display purposes. */
function primaryRole(user) {
    const list = user?.roles ?? [];
    return ROLE_OPTIONS.find((r) => list.includes(r)) || list[0] || '';
}

export default function UsersAdminPage() {
    // Only ADMIN can grant the ADMIN role, edit an ADMIN user, reset their
    // password or deactivate them. canGrantAdmin maps to that capability on
    // the server side too.
    const { canGrantAdmin } = useAuth();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);

    // Dialog state
    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState('create');   // 'create' | 'edit'
    const [formUser, setFormUser] = useState(null);
    const [pwOpen, setPwOpen] = useState(false);
    const [pwUser, setPwUser] = useState(null);

    const showToast = (message, severity = 'success') => setToast({ message, severity });

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            setUsers(await listUsers());
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const availableRoles = useMemo(
        () => (canGrantAdmin ? ROLE_OPTIONS : ROLE_OPTIONS.filter((r) => r !== 'ADMIN')),
        [canGrantAdmin]
    );

    const isAdminUser = (u) => (u?.roles || []).includes('ADMIN');

    // Non-admin callers can't touch admin users (matches the server's 403).
    const canModify = (u) => canGrantAdmin || !isAdminUser(u);

    const openCreate = () => {
        setFormMode('create');
        setFormUser({ username: '', password: '', active: true, role: availableRoles[1] || availableRoles[0] });
        setFormOpen(true);
    };

    const openEdit = (u) => {
        setFormMode('edit');
        setFormUser({
            id: u.id,
            username: u.username,
            active: u.active,
            role: primaryRole(u),
        });
        setFormOpen(true);
    };

    const submitForm = async () => {
        try {
            if (formMode === 'create') {
                if (!formUser.username?.trim()) {
                    showToast('Username is required', 'error'); return;
                }
                if (!formUser.password) {
                    showToast('Password is required', 'error'); return;
                }
                await createUser({
                    username: formUser.username.trim(),
                    password: formUser.password,
                    active: formUser.active,
                    role: formUser.role,
                });
                showToast('User created');
            } else {
                await updateUser(formUser.id, {
                    username: formUser.username.trim(),
                    active: formUser.active,
                    role: formUser.role,
                });
                showToast('User updated');
            }
            setFormOpen(false);
            setFormUser(null);
            await load();
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data?.message
                || (status === 409 ? 'Conflict' : 'Failed to save user');
            showToast(msg, 'error');
        }
    };

    const openPasswordReset = (u) => {
        setPwUser({ id: u.id, username: u.username, password: '' });
        setPwOpen(true);
    };

    const submitPasswordReset = async () => {
        if (!pwUser?.password) {
            showToast('New password is required', 'error'); return;
        }
        try {
            await resetUserPassword(pwUser.id, pwUser.password);
            showToast('Password updated');
            setPwOpen(false);
            setPwUser(null);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to reset password', 'error');
        }
    };

    const handleDeactivate = async (u) => {
        if (!window.confirm(`Deactivate user "${u.username}"?`)) return;
        try {
            await deactivateUser(u.id);
            showToast(`Deactivated ${u.username}`);
            await load();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to deactivate user', 'error');
        }
    };

    // Reactivate via the update endpoint (active=true).
    const handleReactivate = async (u) => {
        try {
            await updateUser(u.id, { active: true, role: primaryRole(u) });
            showToast(`Reactivated ${u.username}`);
            await load();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to reactivate user', 'error');
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <PeopleIcon />
                    <Typography variant="h5">Users</Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                        Add user
                    </Button>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Username</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            <Typography variant="body2" color="text.secondary">
                                                No users yet.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {users.map((u) => {
                                    const role = primaryRole(u);
                                    const modifiable = canModify(u);
                                    return (
                                        <TableRow key={u.id} hover>
                                            <TableCell>
                                                <Typography sx={{ fontWeight: 500 }}>
                                                    {u.username}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={ROLE_LABELS[role] || role || '—'}
                                                    color={ROLE_CHIP_COLOR[role] || 'default'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={u.active ? 'Active' : 'Inactive'}
                                                    color={u.active ? 'success' : 'default'}
                                                    size="small"
                                                    variant={u.active ? 'filled' : 'outlined'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary">
                                                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Tooltip title={modifiable ? 'Edit user' : 'Only ADMIN can edit an ADMIN user'}>
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => openEdit(u)}
                                                            disabled={!modifiable}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title={modifiable ? 'Reset password' : 'Only ADMIN can reset an ADMIN password'}>
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => openPasswordReset(u)}
                                                            disabled={!modifiable}
                                                        >
                                                            <KeyIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                {u.active ? (
                                                    <Tooltip title={modifiable ? 'Deactivate' : 'Only ADMIN can deactivate an ADMIN'}>
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleDeactivate(u)}
                                                                disabled={!modifiable}
                                                                color="error"
                                                            >
                                                                <BlockIcon fontSize="small" />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                ) : (
                                                    <Tooltip title={modifiable ? 'Reactivate' : 'Only ADMIN can reactivate an ADMIN'}>
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleReactivate(u)}
                                                                disabled={!modifiable}
                                                                color="success"
                                                            >
                                                                <ActivateIcon fontSize="small" />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* Create / Edit dialog */}
            <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{formMode === 'create' ? 'Add user' : 'Edit user'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Username"
                            value={formUser?.username ?? ''}
                            onChange={(e) => setFormUser({ ...formUser, username: e.target.value })}
                            fullWidth
                            autoFocus
                        />
                        {formMode === 'create' && (
                            <TextField
                                label="Password"
                                type="password"
                                value={formUser?.password ?? ''}
                                onChange={(e) => setFormUser({ ...formUser, password: e.target.value })}
                                fullWidth
                            />
                        )}
                        <FormControl fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select
                                label="Role"
                                value={formUser?.role ?? ''}
                                onChange={(e) => setFormUser({ ...formUser, role: e.target.value })}
                            >
                                {availableRoles.map((r) => (
                                    <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={!!formUser?.active}
                                    onChange={(e) => setFormUser({ ...formUser, active: e.target.checked })}
                                />
                            }
                            label="Active"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFormOpen(false)}>Cancel</Button>
                    <Button onClick={submitForm} variant="contained">
                        {formMode === 'create' ? 'Create' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Password-reset dialog */}
            <Dialog open={pwOpen} onClose={() => setPwOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Reset password — {pwUser?.username}</DialogTitle>
                <DialogContent>
                    <TextField
                        label="New password"
                        type="password"
                        value={pwUser?.password ?? ''}
                        onChange={(e) => setPwUser({ ...pwUser, password: e.target.value })}
                        fullWidth
                        sx={{ mt: 1 }}
                        autoFocus
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPwOpen(false)}>Cancel</Button>
                    <Button onClick={submitPasswordReset} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={!!toast}
                autoHideDuration={4500}
                onClose={() => setToast(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                {toast ? (
                    <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
                        {toast.message}
                    </Alert>
                ) : undefined}
            </Snackbar>
        </Box>
    );
}
