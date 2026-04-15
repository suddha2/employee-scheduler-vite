import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Paper,
    TextField,
    Button,
    Typography,
    Grid,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Autocomplete,
    Alert,
    Divider,
    FormControlLabel,
    Switch,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    Chip
} from '@mui/material';
import {
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import axiosInstance from '../components/axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';

const ShiftTemplateForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    // Form data state
    const [formData, setFormData] = useState({
        location: '',
        region: '',
        shiftType: '',
        daysOfWeek: [],
        startTime: '',
        endTime: '',
        breakStart: '',
        breakEnd: '',
        totalHours: '',
        requiredGender: '',
        requiredSkills: [],
        empCount: 1,
        priority: 1,
        active: true
    });

    // Dropdown options
    const [regions, setRegions] = useState([]);
    const [locations, setLocations] = useState([]);

    const shiftTypes = ['LONG_DAY', 'DAY', 'SLEEP_IN', 'WAKING_NIGHT', 'FLOATING', 'CARE_CALL'];
    const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const genders = ['ANY', 'MALE', 'FEMALE'];
    const skillOptions = ['BUCCAL', 'DRIVING'];

    // UI state
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState({});

    // ✅ NEW: Bulk edit state
    const [bulkEditMode, setBulkEditMode] = useState(false);
    const [affectedTemplates, setAffectedTemplates] = useState([]);
    const [loadingAffected, setLoadingAffected] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [originalFormData, setOriginalFormData] = useState(null);

    // Fetch regions on mount
    useEffect(() => {
        fetchRegions();
        if (isEditMode) {
            fetchShiftTemplate();
        }
    }, [id]);

    // Fetch locations when region changes
    useEffect(() => {
        if (formData.region) {
            fetchLocations(formData.region);
        }
    }, [formData.region]);

    // ✅ NEW: Fetch affected templates when bulk mode enabled
    useEffect(() => {
        if (bulkEditMode && formData.location && formData.shiftType) {
            fetchAffectedTemplates();
        }
    }, [bulkEditMode]);

    const fetchRegions = async () => {
        try {
            const response = await axiosInstance.get(`${API_ENDPOINTS.shiftTemplates}/regions`);
            setRegions(response.data);
        } catch (err) {
            console.error('Failed to fetch regions:', err);
        }
    };

    const fetchLocations = async (region) => {
        try {
            const response = await axiosInstance.get(
                `${API_ENDPOINTS.shiftTemplates}/regions/${region}/locations`
            );
            setLocations(response.data);
        } catch (err) {
            console.error('Failed to fetch locations:', err);
        }
    };

    const fetchShiftTemplate = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get(`${API_ENDPOINTS.shiftTemplates}/${id}`);
            const template = response.data;

            const loadedData = {
                location: template.location || '',
                region: template.region || '',
                shiftType: template.shiftType || '',
                daysOfWeek: template.dayOfWeek ? [template.dayOfWeek] : [],
                startTime: template.startTime || '',
                endTime: template.endTime || '',
                breakStart: template.breakStart || '',
                breakEnd: template.breakEnd || '',
                totalHours: template.totalHours || '',
                requiredGender: template.requiredGender || '',
                requiredSkills: template.requiredSkills || [],
                empCount: template.empCount || 1,
                priority: template.priority || 1,
                active: template.active !== undefined ? template.active : true
            };

            setFormData(loadedData);
            setOriginalFormData(loadedData); // ✅ Store original for comparison
        } catch (err) {
            console.error('Failed to fetch shift template:', err);
            setError('Failed to load shift template data.');
        } finally {
            setLoading(false);
        }
    };

    // ✅ NEW: Fetch templates that will be affected by bulk edit
    const fetchAffectedTemplates = async () => {
        setLoadingAffected(true);
        try {
            const response = await axiosInstance.get(
                `${API_ENDPOINTS.shiftTemplates}/match`,
                {
                    params: {
                        location: formData.location,
                        shiftType: formData.shiftType,
                        region: formData.region
                    }
                }
            );
            setAffectedTemplates(response.data || []);
        } catch (err) {
            console.error('Failed to fetch matching templates:', err);
            setAffectedTemplates([]);
        } finally {
            setLoadingAffected(false);
        }
    };

    // ✅ NEW: Handle bulk mode toggle
    const handleBulkModeToggle = (event) => {
        const enabled = event.target.checked;
        setBulkEditMode(enabled);
        
        if (!enabled) {
            setAffectedTemplates([]);
        }
    };

    // ✅ NEW: Get list of changed fields
    const getChangedFields = () => {
        if (!originalFormData) return [];
        
        const changes = [];
        
        if (formData.startTime !== originalFormData.startTime) {
            changes.push({
                field: 'Start Time',
                from: originalFormData.startTime,
                to: formData.startTime
            });
        }
        if (formData.endTime !== originalFormData.endTime) {
            changes.push({
                field: 'End Time',
                from: originalFormData.endTime,
                to: formData.endTime
            });
        }
        if (formData.breakStart !== originalFormData.breakStart) {
            changes.push({
                field: 'Break Start',
                from: originalFormData.breakStart || 'None',
                to: formData.breakStart || 'None'
            });
        }
        if (formData.breakEnd !== originalFormData.breakEnd) {
            changes.push({
                field: 'Break End',
                from: originalFormData.breakEnd || 'None',
                to: formData.breakEnd || 'None'
            });
        }
        if (formData.totalHours !== originalFormData.totalHours) {
            changes.push({
                field: 'Total Hours',
                from: originalFormData.totalHours || 'Auto',
                to: formData.totalHours || 'Auto'
            });
        }
        if (formData.empCount !== originalFormData.empCount) {
            changes.push({
                field: 'Employee Count',
                from: originalFormData.empCount,
                to: formData.empCount
            });
        }
        if (formData.priority !== originalFormData.priority) {
            changes.push({
                field: 'Priority',
                from: originalFormData.priority,
                to: formData.priority
            });
        }
        if (formData.requiredGender !== originalFormData.requiredGender) {
            changes.push({
                field: 'Required Gender',
                from: originalFormData.requiredGender || 'ANY',
                to: formData.requiredGender || 'ANY'
            });
        }
        if (JSON.stringify(formData.requiredSkills) !== JSON.stringify(originalFormData.requiredSkills)) {
            changes.push({
                field: 'Required Skills',
                from: originalFormData.requiredSkills.join(', ') || 'None',
                to: formData.requiredSkills.join(', ') || 'None'
            });
        }
        if (formData.active !== originalFormData.active) {
            changes.push({
                field: 'Active Status',
                from: originalFormData.active ? 'Active' : 'Inactive',
                to: formData.active ? 'Active' : 'Inactive'
            });
        }
        
        return changes;
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.location.trim()) {
            newErrors.location = 'Location is required';
        }
        if (!formData.region.trim()) {
            newErrors.region = 'Region is required';
        }
        if (!formData.shiftType) {
            newErrors.shiftType = 'Shift type is required';
        }
        if (!bulkEditMode && (!formData.daysOfWeek || formData.daysOfWeek.length === 0)) {
            newErrors.dayOfWeek = 'At least one day is required';
        }
        if (!formData.startTime) {
            newErrors.startTime = 'Start time is required';
        }
        if (!formData.endTime) {
            newErrors.endTime = 'End time is required';
        }
        if (!formData.empCount || formData.empCount < 1) {
            newErrors.empCount = 'Employee count must be at least 1';
        }
        if (!formData.priority || formData.priority < 1) {
            newErrors.priority = 'Priority must be at least 1';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (field) => (event) => {
        setFormData({
            ...formData,
            [field]: event.target.value
        });
        if (errors[field]) {
            setErrors({ ...errors, [field]: undefined });
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!validate()) {
            setError('Please fix the validation errors before submitting.');
            return;
        }

        // ✅ NEW: If bulk edit mode and multiple templates, show confirmation
        if (isEditMode && bulkEditMode && affectedTemplates.length > 1) {
            setConfirmDialogOpen(true);
            return;
        }

        // Normal single update
        await performSave();
    };

    // ✅ NEW: Perform the actual save operation
    const performSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const payload = {
                ...formData,
                empCount: parseInt(formData.empCount),
                priority: parseInt(formData.priority),
                totalHours: formData.totalHours ? parseFloat(formData.totalHours) : null
            };

            if (isEditMode && bulkEditMode && affectedTemplates.length > 1) {
                // ✅ Bulk update endpoint
                await axiosInstance.put(
                    `${API_ENDPOINTS.shiftTemplates}/bulk-update`,
                    {
                        location: formData.location,
                        shiftType: formData.shiftType,
                        region: formData.region,
                        updates: {
                            startTime: formData.startTime,
                            endTime: formData.endTime,
                            breakStart: formData.breakStart || null,
                            breakEnd: formData.breakEnd || null,
                            totalHours: payload.totalHours,
                            requiredGender: formData.requiredGender || null,
                            requiredSkills: formData.requiredSkills,
                            empCount: payload.empCount,
                            priority: payload.priority,
                            active: formData.active
                        }
                    }
                );
                setSuccess(true);
                setTimeout(() => navigate('/shift-templates'), 2000);
            } else if (isEditMode) {
                // Single template update
                await axiosInstance.put(`${API_ENDPOINTS.shiftTemplates}/${id}`, {
                    ...payload,
                    dayOfWeek: formData.daysOfWeek[0]
                });
                setSuccess(true);
                setTimeout(() => navigate('/shift-templates'), 2000);
            } else {
                // Create mode - send daysOfWeek array to backend
                await axiosInstance.post(API_ENDPOINTS.shiftTemplates, payload);
                setSuccess(true);
                setTimeout(() => navigate('/shift-templates'), 2000);
            }
        } catch (err) {
            console.error('Failed to save shift template:', err);
            setError(err.response?.data?.message || 'Failed to save shift template. Please try again.');
        } finally {
            setSaving(false);
            setConfirmDialogOpen(false);
        }
    };

    // ✅ NEW: Handle bulk update confirmation
    const handleConfirmBulkUpdate = () => {
        performSave();
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    const changedFields = getChangedFields();

    return (
        <Box sx={{ p: 3 }}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>
                    {isEditMode ? 'Edit Shift Template' : 'Create Shift Template'}
                </Typography>
                <Divider sx={{ mb: 3 }} />

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>
                    Shift template {isEditMode && bulkEditMode ? `updated (${affectedTemplates.length} templates)` : isEditMode ? 'updated' : 'created'} successfully!
                </Alert>}

                {/* ✅ NEW: Bulk Edit Mode Toggle */}
                {isEditMode && (
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            mb: 3, 
                            p: 2, 
                            bgcolor: bulkEditMode ? 'warning.light' : 'info.light',
                            border: 1,
                            borderColor: bulkEditMode ? 'warning.main' : 'info.main'
                        }}
                    >
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={bulkEditMode}
                                    onChange={handleBulkModeToggle}
                                    color={bulkEditMode ? 'warning' : 'primary'}
                                />
                            }
                            label={
                                <Box>
                                    <Typography variant="body1" fontWeight="medium">
                                        {bulkEditMode ? '⚠️ Bulk Edit Mode Active' : 'Enable Bulk Edit Mode'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {bulkEditMode 
                                            ? 'Changes will apply to ALL shift templates with same location and shift type'
                                            : 'Apply changes to all days with same location and shift type'
                                        }
                                    </Typography>
                                </Box>
                            }
                        />
                        
                        {bulkEditMode && (
                            <Box sx={{ mt: 2 }}>
                                {loadingAffected ? (
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <CircularProgress size={20} />
                                        <Typography variant="body2">Loading affected templates...</Typography>
                                    </Box>
                                ) : affectedTemplates.length > 0 ? (
                                    <Alert severity="warning" icon={<WarningIcon />}>
                                        <Typography variant="body2" fontWeight="medium">
                                            <strong>{affectedTemplates.length} shift template{affectedTemplates.length !== 1 ? 's' : ''}</strong> will be updated:
                                        </Typography>
                                        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {affectedTemplates.map((template, idx) => (
                                                <Chip
                                                    key={idx}
                                                    label={template.dayOfWeek}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            ))}
                                        </Box>
                                    </Alert>
                                ) : (
                                    <Alert severity="info">
                                        No matching templates found
                                    </Alert>
                                )}
                            </Box>
                        )}
                    </Paper>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Basic Information */}
                    <Typography variant="h6" gutterBottom>
                        Basic Information
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth error={Boolean(errors.region)}>
                                <InputLabel>Region</InputLabel>
                                <Select
                                    value={formData.region}
                                    onChange={handleChange('region')}
                                    label="Region"
                                    disabled={bulkEditMode}
                                >
                                    {regions.map((region) => (
                                        <MenuItem key={region} value={region}>
                                            {region}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.region && (
                                    <Typography color="error" variant="caption">{errors.region}</Typography>
                                )}
                                {bulkEditMode && (
                                    <Typography variant="caption" color="warning.main">
                                        Read-only in bulk edit mode
                                    </Typography>
                                )}
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Autocomplete
                                freeSolo
                                options={locations}
                                value={formData.location}
                                inputValue={formData.location}
                                onChange={(e, newValue) => {
                                    setFormData({ ...formData, location: newValue || '' });
                                    if (errors.location) {
                                        setErrors({ ...errors, location: undefined });
                                    }
                                }}
                                onInputChange={(e, newInputValue) => {
                                    setFormData({ ...formData, location: newInputValue });
                                    if (errors.location) {
                                        setErrors({ ...errors, location: undefined });
                                    }
                                }}
                                disabled={!formData.region || bulkEditMode}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Service Location"
                                        error={Boolean(errors.location)}
                                        helperText={
                                            bulkEditMode 
                                                ? 'Read-only in bulk edit mode'
                                                : errors.location || 'Select existing or type new location'
                                        }
                                    />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth error={Boolean(errors.shiftType)}>
                                <InputLabel>Shift Type</InputLabel>
                                <Select
                                    value={formData.shiftType}
                                    onChange={handleChange('shiftType')}
                                    label="Shift Type"
                                    disabled={bulkEditMode}
                                >
                                    {shiftTypes.map((type) => (
                                        <MenuItem key={type} value={type}>
                                            {type.replace('_', ' ')}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.shiftType && (
                                    <Typography color="error" variant="caption">{errors.shiftType}</Typography>
                                )}
                                {bulkEditMode && (
                                    <Typography variant="caption" color="warning.main">
                                        Read-only in bulk edit mode
                                    </Typography>
                                )}
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Autocomplete
                                multiple
                                options={daysOfWeek}
                                value={formData.daysOfWeek}
                                onChange={(e, value) => {
                                    setFormData({ ...formData, daysOfWeek: value });
                                    if (errors.daysOfWeek) {
                                        setErrors({ ...errors, daysOfWeek: undefined });
                                    }
                                }}
                                disabled={bulkEditMode}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Days of Week"
                                        error={Boolean(errors.daysOfWeek)}
                                        helperText={
                                            bulkEditMode 
                                                ? `Applies to all days (${affectedTemplates.length} templates)`
                                                : errors.daysOfWeek
                                        }
                                    />
                                )}
                            />
                        </Grid>
                    </Grid>

                    {/* Time Details */}
                    <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                        Time Details
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                label="Start Time"
                                type="time"
                                value={formData.startTime}
                                onChange={handleChange('startTime')}
                                error={Boolean(errors.startTime)}
                                helperText={errors.startTime}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                label="End Time"
                                type="time"
                                value={formData.endTime}
                                onChange={handleChange('endTime')}
                                error={Boolean(errors.endTime)}
                                helperText={errors.endTime}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                label="Break Start"
                                type="time"
                                value={formData.breakStart}
                                onChange={handleChange('breakStart')}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                label="Break End"
                                type="time"
                                value={formData.breakEnd}
                                onChange={handleChange('breakEnd')}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="Total Hours"
                                type="number"
                                value={formData.totalHours}
                                onChange={handleChange('totalHours')}
                                inputProps={{ step: '0.25', min: '0' }}
                            />
                        </Grid>
                    </Grid>

                    {/* Requirements */}
                    <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                        Requirements
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth>
                                <InputLabel>Required Gender</InputLabel>
                                <Select
                                    value={formData.requiredGender}
                                    onChange={handleChange('requiredGender')}
                                    label="Required Gender"
                                >
                                    {genders.map((gender) => (
                                        <MenuItem key={gender} value={gender}>
                                            {gender}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={8}>
                            <Autocomplete
                                multiple
                                options={skillOptions}
                                value={formData.requiredSkills}
                                onChange={(e, value) => setFormData({ ...formData, requiredSkills: value })}
                                renderInput={(params) => (
                                    <TextField {...params} label="Required Skills" />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="Employee Count"
                                type="number"
                                value={formData.empCount}
                                onChange={handleChange('empCount')}
                                error={Boolean(errors.empCount)}
                                helperText={errors.empCount || 'Number of employees needed'}
                                inputProps={{ min: '1' }}
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="Priority"
                                type="number"
                                value={formData.priority}
                                onChange={handleChange('priority')}
                                error={Boolean(errors.priority)}
                                helperText={errors.priority || 'Allocation priority (lower = higher priority)'}
                                inputProps={{ min: '1' }}
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.active}
                                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                    />
                                }
                                label="Active"
                            />
                        </Grid>
                    </Grid>

                    {/* Action Buttons */}
                    <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            color={bulkEditMode ? "warning" : "primary"}
                            disabled={saving}
                            startIcon={saving && <CircularProgress size={20} />}
                        >
                            {saving 
                                ? 'Saving...' 
                                : bulkEditMode && affectedTemplates.length > 1
                                    ? `Update All (${affectedTemplates.length})`
                                    : isEditMode ? 'Update' : 'Create'
                            }
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => navigate('/shift-templates')}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                    </Box>
                </form>
            </Paper>

            {/* ✅ NEW: Bulk Update Confirmation Dialog */}
            <Dialog
                open={confirmDialogOpen}
                onClose={() => !saving && setConfirmDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <WarningIcon color="warning" />
                        <Typography variant="h6">
                            Confirm Bulk Update
                        </Typography>
                    </Box>
                </DialogTitle>
                
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        You are about to update <strong>{affectedTemplates.length} shift templates</strong>
                    </Alert>

                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                        Affected Templates:
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2, maxHeight: 200, overflow: 'auto' }}>
                        <List dense>
                            {affectedTemplates.map((template, idx) => (
                                <ListItem key={idx} sx={{ py: 0.5 }}>
                                    <ListItemText
                                        primary={`${formData.location} - ${formData.shiftType} (${template.dayOfWeek})`}
                                        secondary={`${template.startTime} - ${template.endTime}`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>

                    {changedFields.length > 0 && (
                        <>
                            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                                Changes to Apply:
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <List dense>
                                    {changedFields.map((change, idx) => (
                                        <ListItem key={idx} sx={{ py: 0.5 }}>
                                            <ListItemText
                                                primary={change.field}
                                                secondary={
                                                    <Box component="span" display="flex" alignItems="center" gap={1}>
                                                        <span style={{ textDecoration: 'line-through', color: 'gray' }}>
                                                            {change.from}
                                                        </span>
                                                        <span>→</span>
                                                        <span style={{ fontWeight: 'bold', color: 'green' }}>
                                                            {change.to}
                                                        </span>
                                                    </Box>
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        </>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button 
                        onClick={() => setConfirmDialogOpen(false)} 
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="warning"
                        onClick={handleConfirmBulkUpdate}
                        disabled={saving}
                        startIcon={saving ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                    >
                        {saving ? 'Updating...' : `Confirm Update (${affectedTemplates.length} templates)`}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ShiftTemplateForm;