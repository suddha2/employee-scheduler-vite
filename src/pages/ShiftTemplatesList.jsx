import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    IconButton,
    Typography,
    Chip,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import axiosInstance from '../components/axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';

const ShiftTemplatesList = () => {
    const navigate = useNavigate();

    // State
    const [templates, setTemplates] = useState([]);
    const [filteredTemplates, setFilteredTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState(null);

    // Filter state
    const [filters, setFilters] = useState({
        region: '',
        location: '',
        shiftType: '',
        dayOfWeek: '',
        showInactive: false
    });

    const [regions, setRegions] = useState([]);
    const shiftTypes = ['LONG_DAY', 'DAY', 'SLEEP_IN', 'WAKING_NIGHT', 'FLOATING','CARE_CALL'];
    const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

    useEffect(() => {
        fetchRegions();
        fetchTemplates();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [templates, filters]);

    const fetchRegions = async () => {
        try {
            const response = await axiosInstance.get(`${API_ENDPOINTS.shiftTemplates}/regions`);
            setRegions(response.data);
        } catch (err) {
            console.error('Failed to fetch regions:', err);
        }
    };

    const fetchTemplates = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axiosInstance.get(API_ENDPOINTS.shiftTemplates);
            setTemplates(response.data);
        } catch (err) {
            console.error('Failed to fetch shift templates:', err);
            setError('Failed to load shift templates. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...templates];

        // Filter by active status
        if (!filters.showInactive) {
            filtered = filtered.filter(t => t.active);
        }

        // Filter by region
        if (filters.region) {
            filtered = filtered.filter(t => t.region === filters.region);
        }

        // Filter by location
        if (filters.location) {
            filtered = filtered.filter(t => 
                t.location.toLowerCase().includes(filters.location.toLowerCase())
            );
        }

        // Filter by shift type
        if (filters.shiftType) {
            filtered = filtered.filter(t => t.shiftType === filters.shiftType);
        }

        // Filter by day
        if (filters.dayOfWeek) {
            filtered = filtered.filter(t => t.dayOfWeek === filters.dayOfWeek);
        }

        setFilteredTemplates(filtered);
    };

    const handleDelete = async () => {
        if (!templateToDelete) return;

        try {
            await axiosInstance.delete(`${API_ENDPOINTS.shiftTemplates}/${templateToDelete.id}`);
            setTemplates(templates.filter(t => t.id !== templateToDelete.id));
            setDeleteDialogOpen(false);
            setTemplateToDelete(null);
        } catch (err) {
            console.error('Failed to delete shift template:', err);
            setError('Failed to delete shift template. Please try again.');
        }
    };

    const handleToggleActive = async (template) => {
        try {
            await axiosInstance.patch(
                `${API_ENDPOINTS.shiftTemplates}/${template.id}/toggle-active`
            );
            fetchTemplates();
        } catch (err) {
            console.error('Failed to toggle active status:', err);
            setError('Failed to update template. Please try again.');
        }
    };

    const openDeleteDialog = (template) => {
        setTemplateToDelete(template);
        setDeleteDialogOpen(true);
    };

    const formatTime = (time) => {
        if (!time) return '-';
        return time.substring(0, 5); // HH:MM
    };

    const getShiftTypeColor = (shiftType) => {
        const colors = {
            'LONG_DAY': 'primary',
            'DAY': 'info',
            'SLEEP_IN': 'secondary',
            'WAKING_NIGHT': 'warning',
            'FLOATING': 'default'
        };
        return colors[shiftType] || 'default';
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Paper sx={{ p: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5">Shift Templates</Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/shift-templates/new')}
                    >
                        Create Template
                    </Button>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {/* Filters */}
                <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <FormControl sx={{ minWidth: 150 }}>
                        <InputLabel>Region</InputLabel>
                        <Select
                            value={filters.region}
                            onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                            label="Region"
                        >
                            <MenuItem value="">All</MenuItem>
                            {regions.map((region) => (
                                <MenuItem key={region} value={region}>{region}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        label="Service Location"
                        value={filters.location}
                        onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                        sx={{ minWidth: 200 }}
                    />

                    <FormControl sx={{ minWidth: 150 }}>
                        <InputLabel>Shift Type</InputLabel>
                        <Select
                            value={filters.shiftType}
                            onChange={(e) => setFilters({ ...filters, shiftType: e.target.value })}
                            label="Shift Type"
                        >
                            <MenuItem value="">All</MenuItem>
                            {shiftTypes.map((type) => (
                                <MenuItem key={type} value={type}>{type.replace('_', ' ')}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl sx={{ minWidth: 150 }}>
                        <InputLabel>Day</InputLabel>
                        <Select
                            value={filters.dayOfWeek}
                            onChange={(e) => setFilters({ ...filters, dayOfWeek: e.target.value })}
                            label="Day"
                        >
                            <MenuItem value="">All</MenuItem>
                            {daysOfWeek.map((day) => (
                                <MenuItem key={day} value={day}>{day}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Button
                        variant={filters.showInactive ? 'contained' : 'outlined'}
                        onClick={() => setFilters({ ...filters, showInactive: !filters.showInactive })}
                        startIcon={filters.showInactive ? <VisibilityIcon /> : <VisibilityOffIcon />}
                    >
                        {filters.showInactive ? 'Showing All' : 'Active Only'}
                    </Button>
                </Box>

                {/* Table */}
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell><strong>Region</strong></TableCell>
                                <TableCell><strong>Service</strong></TableCell>
                                <TableCell><strong>Day</strong></TableCell>
                                <TableCell><strong>Shift Type</strong></TableCell>
                                <TableCell><strong>Time</strong></TableCell>
                                <TableCell><strong>Hours</strong></TableCell>
                                <TableCell><strong>Emp Count</strong></TableCell>
                                <TableCell><strong>Priority</strong></TableCell>
                                <TableCell><strong>Status</strong></TableCell>
                                <TableCell><strong>Actions</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTemplates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} align="center">
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                                            No shift templates found
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTemplates.map((template) => (
                                    <TableRow key={template.id}>
                                        <TableCell>{template.region}</TableCell>
                                        <TableCell>{template.location}</TableCell>
                                        <TableCell>{template.dayOfWeek}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={template.shiftType.replace('_', ' ')}
                                                color={getShiftTypeColor(template.shiftType)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {formatTime(template.startTime)} - {formatTime(template.endTime)}
                                        </TableCell>
                                        <TableCell>{template.totalHours || '-'}</TableCell>
                                        <TableCell>{template.empCount}</TableCell>
                                        <TableCell>{template.priority}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={template.active ? 'Active' : 'Inactive'}
                                                color={template.active ? 'success' : 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <IconButton
                                                color="primary"
                                                onClick={() => navigate(`/shift-templates/edit/${template.id}`)}
                                                size="small"
                                            >
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton
                                                color={template.active ? 'warning' : 'success'}
                                                onClick={() => handleToggleActive(template)}
                                                size="small"
                                                title={template.active ? 'Deactivate' : 'Activate'}
                                            >
                                                {template.active ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                            </IconButton>
                                            <IconButton
                                                color="error"
                                                onClick={() => openDeleteDialog(template)}
                                                size="small"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Showing {filteredTemplates.length} of {templates.length} templates
                </Typography>
            </Paper>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete this shift template?
                    {templateToDelete && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body2">
                                <strong>Region:</strong> {templateToDelete.region}<br />
                                <strong>Service:</strong> {templateToDelete.location}<br />
                                <strong>Day:</strong> {templateToDelete.dayOfWeek}<br />
                                <strong>Shift:</strong> {templateToDelete.shiftType}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleDelete} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ShiftTemplatesList;