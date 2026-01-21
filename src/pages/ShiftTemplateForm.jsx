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
    CircularProgress
} from '@mui/material';
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

            setFormData({
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
            });
        } catch (err) {
            console.error('Failed to fetch shift template:', err);
            setError('Failed to load shift template data.');
        } finally {
            setLoading(false);
        }
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
        if (!formData.daysOfWeek || formData.daysOfWeek.length === 0) {
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


            if (isEditMode) {
                // Edit mode - single template update with first day
                await axiosInstance.put(`${API_ENDPOINTS.shiftTemplates}/${id}`, {
                    ...payload,
                    dayOfWeek: formData.daysOfWeek[0] // Backend expects single day
                });
            } else {
                // Create mode - send daysOfWeek array to backend
                await axiosInstance.post(API_ENDPOINTS.shiftTemplates, payload);
            }
            setSuccess(true);
            setTimeout(() => navigate('/shift-templates'), 2000);
        } catch (err) {
            console.error('Failed to save shift template:', err);
            setError(err.response?.data?.message || 'Failed to save shift template. Please try again.');
        } finally {
            setSaving(false);
        }
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
                <Typography variant="h5" gutterBottom>
                    {isEditMode ? 'Edit Shift Template' : 'Create Shift Template'}
                </Typography>
                <Divider sx={{ mb: 3 }} />

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>
                    Shift template {isEditMode ? 'updated' : 'created'} successfully!
                </Alert>}

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
                                disabled={!formData.region}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Service Location"
                                        error={Boolean(errors.location)}
                                        helperText={errors.location || 'Select existing or type new location'}
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
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Days of Week"
                                        error={Boolean(errors.daysOfWeek)}
                                        helperText={errors.daysOfWeek}
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
                            color="primary"
                            disabled={saving}
                            startIcon={saving && <CircularProgress size={20} />}
                        >
                            {saving ? 'Saving...' : (isEditMode ? 'Update' : 'Create')}
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
        </Box>
    );
};

export default ShiftTemplateForm;