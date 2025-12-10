import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    TextField,
    Button,
    Typography,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    Chip,
    IconButton,
    Autocomplete,
    Alert,
    CircularProgress,
    Divider
} from '@mui/material';
import {
    Save as SaveIcon,
    Cancel as CancelIcon,
    Add as AddIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../components/axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';

export default function EmployeeForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    // Form state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        gender: '',
        contractType: '',
        minHrs: '',
        maxHrs: '',
        rateCode: '',
        restDays: '',
        preferredRegion: '',
        preferredService: [],
        restrictedService: [],
        preferredDays: [],
        restrictedDays: [],
        preferredShifts: [],
        restrictedShifts: [],
        skills: [],
        daysOn: '',
        daysOff: '',
        weekOn: '',
        weekOff: '',
        invertPattern: false
    });

    // Service weight state (for preferred locations)
    const [serviceWeights, setServiceWeights] = useState([]);
    const [newLocation, setNewLocation] = useState('');
    const [newWeight, setNewWeight] = useState('100');

    // UI state
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState({});

    // Dropdown options
    const [regions, setRegions] = useState([]);
    const [locations, setLocations] = useState([]);
    const genders = ['MALE', 'FEMALE', 'OTHER'];
    const contractTypes = ['PERMANENT', 'ZERO_HOURS', 'FIXED_TERM', 'PART_TIME'];
    const rateCodes = ['STANDARD', 'SENIOR', 'JUNIOR', 'SPECIALIST'];
    const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const shiftTypes = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'SPLIT'];
    const skillsList = ['First Aid', 'Manual Handling', 'Medication', 'Driving', 'Personal Care', 'Dementia Care'];

    // Fetch dropdown data
    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const response = await axiosInstance.get(API_ENDPOINTS.locations);
                const regionsList = [...new Set(response.data.map(loc => loc.region))];
                const locationsList = response.data.map(loc => loc.region);
                setRegions(regionsList);
                setLocations(locationsList);
            } catch (err) {
                console.error('Failed to fetch locations:', err);
            }
        };
        fetchDropdownData();
    }, []);

    // Fetch employee data if edit mode
    useEffect(() => {
        if (isEditMode) {
            fetchEmployee();
        }
    }, [id]);

    const fetchEmployee = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get(`${API_ENDPOINTS.employees}/${id}`);
            const employee = response.data;
            
            // Parse preferred service into location:weight format
            const parsedWeights = (employee.preferredService || []).map(service => {
                if (service.includes(':')) {
                    const [loc, weight] = service.split(':');
                    return { location: loc.trim(), weight: weight.trim() };
                }
                return { location: service.trim(), weight: '100' };
            });
            setServiceWeights(parsedWeights);

            setFormData({
                firstName: employee.firstName || '',
                lastName: employee.lastName || '',
                gender: employee.gender || '',
                contractType: employee.contractType || '',
                minHrs: employee.minHrs || '',
                maxHrs: employee.maxHrs || '',
                rateCode: employee.rateCode || '',
                restDays: employee.restDays || '',
                preferredRegion: employee.preferredRegion || '',
                preferredService: employee.preferredService || [],
                restrictedService: employee.restrictedService || [],
                preferredDays: employee.preferredDays || [],
                restrictedDays: employee.restrictedDays || [],
                preferredShifts: employee.preferredShifts || [],
                restrictedShifts: employee.restrictedShifts || [],
                skills: employee.skills || [],
                daysOn: employee.daysOn || '',
                daysOff: employee.daysOff || '',
                weekOn: employee.weekOn || '',
                weekOff: employee.weekOff || '',
                invertPattern: employee.invertPattern || false
            });
        } catch (err) {
            console.error('Failed to fetch employee:', err);
            setError('Failed to load employee data.');
        } finally {
            setLoading(false);
        }
    };

    // Validation
    const validate = () => {
        const newErrors = {};

        // Required fields
        if (!formData.firstName?.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName?.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.contractType) newErrors.contractType = 'Contract type is required';

        // Hours validation
        const minHrs = parseFloat(formData.minHrs);
        const maxHrs = parseFloat(formData.maxHrs);

        if (formData.minHrs && isNaN(minHrs)) {
            newErrors.minHrs = 'Min hours must be a number';
        } else if (minHrs < 0) {
            newErrors.minHrs = 'Min hours cannot be negative';
        }

        if (formData.maxHrs && isNaN(maxHrs)) {
            newErrors.maxHrs = 'Max hours must be a number';
        } else if (maxHrs < 0) {
            newErrors.maxHrs = 'Max hours cannot be negative';
        }

        if (minHrs && maxHrs && minHrs > maxHrs) {
            newErrors.maxHrs = 'Max hours must be greater than or equal to min hours';
        }

        // Rest days validation
        if (formData.restDays && (isNaN(formData.restDays) || formData.restDays < 0)) {
            newErrors.restDays = 'Rest days must be a positive number';
        }

        // Pattern validation
        if (formData.daysOn && (isNaN(formData.daysOn) || formData.daysOn < 0)) {
            newErrors.daysOn = 'Days on must be a positive number';
        }
        if (formData.daysOff && (isNaN(formData.daysOff) || formData.daysOff < 0)) {
            newErrors.daysOff = 'Days off must be a positive number';
        }
        if (formData.weekOn && (isNaN(formData.weekOn) || formData.weekOn < 0)) {
            newErrors.weekOn = 'Week on must be a positive number';
        }
        if (formData.weekOff && (isNaN(formData.weekOff) || formData.weekOff < 0)) {
            newErrors.weekOff = 'Week off must be a positive number';
        }

        // Service weight validation
        const invalidWeights = serviceWeights.filter(sw => {
            const weight = parseInt(sw.weight);
            return isNaN(weight) || weight < 0 || weight > 100;
        });
        if (invalidWeights.length > 0) {
            newErrors.serviceWeights = 'All location weights must be between 0 and 100';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle input changes
    const handleChange = (field) => (event) => {
        setFormData({
            ...formData,
            [field]: event.target.value
        });
        // Clear error for this field
        if (errors[field]) {
            setErrors({ ...errors, [field]: undefined });
        }
    };

    // Handle service weight management
    const handleAddLocation = () => {
        if (!newLocation.trim()) return;

        const weight = parseInt(newWeight);
        if (isNaN(weight) || weight < 0 || weight > 100) {
            setErrors({ ...errors, serviceWeights: 'Weight must be between 0 and 100' });
            return;
        }

        // Check if location already exists
        if (serviceWeights.some(sw => sw.location === newLocation)) {
            setErrors({ ...errors, serviceWeights: 'Location already added' });
            return;
        }

        setServiceWeights([...serviceWeights, { location: newLocation, weight: newWeight }]);
        setNewLocation('');
        setNewWeight('100');
        setErrors({ ...errors, serviceWeights: undefined });
    };

    const handleRemoveLocation = (location) => {
        setServiceWeights(serviceWeights.filter(sw => sw.location !== location));
    };

    // Handle form submission
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
            // Convert service weights to "Location:Weight" format
            const preferredServiceFormatted = serviceWeights.map(
                sw => `${sw.location}:${sw.weight}`
            );

            const payload = {
                ...formData,
                preferredService: preferredServiceFormatted,
                minHrs: formData.minHrs ? parseFloat(formData.minHrs) : null,
                maxHrs: formData.maxHrs ? parseFloat(formData.maxHrs) : null,
                restDays: formData.restDays ? parseInt(formData.restDays) : null,
                daysOn: formData.daysOn ? parseInt(formData.daysOn) : null,
                daysOff: formData.daysOff ? parseInt(formData.daysOff) : null,
                weekOn: formData.weekOn ? parseInt(formData.weekOn) : null,
                weekOff: formData.weekOff ? parseInt(formData.weekOff) : null,
            };

            if (isEditMode) {
                await axiosInstance.put(`${API_ENDPOINTS.employees}/${id}`, payload);
                setSuccess(true);
                setTimeout(() => navigate('/employees'), 2000);
            } else {
                await axiosInstance.post(API_ENDPOINTS.employees, payload);
                setSuccess(true);
                setTimeout(() => navigate('/employees'), 2000);
            }
        } catch (err) {
            console.error('Failed to save employee:', err);
            setError(err.response?.data?.message || 'Failed to save employee. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, mt: 8 }}>
            <Paper sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
                {/* Header */}
                <Typography variant="h4" gutterBottom>
                    {isEditMode ? 'Edit Employee' : 'Create New Employee'}
                </Typography>

                {/* Success/Error Messages */}
                {success && (
                    <Alert severity="success" sx={{ mb: 3 }}>
                        Employee {isEditMode ? 'updated' : 'created'} successfully! Redirecting...
                    </Alert>
                )}
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Basic Information */}
                    <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                        Basic Information
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                required
                                label="First Name"
                                value={formData.firstName}
                                onChange={handleChange('firstName')}
                                error={!!errors.firstName}
                                helperText={errors.firstName}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                required
                                label="Last Name"
                                value={formData.lastName}
                                onChange={handleChange('lastName')}
                                error={!!errors.lastName}
                                helperText={errors.lastName}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth required error={!!errors.gender}>
                                <InputLabel>Gender</InputLabel>
                                <Select
                                    value={formData.gender}
                                    onChange={handleChange('gender')}
                                    label="Gender"
                                >
                                    {genders.map(gender => (
                                        <MenuItem key={gender} value={gender}>{gender}</MenuItem>
                                    ))}
                                </Select>
                                {errors.gender && <FormHelperText>{errors.gender}</FormHelperText>}
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth required error={!!errors.contractType}>
                                <InputLabel>Contract Type</InputLabel>
                                <Select
                                    value={formData.contractType}
                                    onChange={handleChange('contractType')}
                                    label="Contract Type"
                                >
                                    {contractTypes.map(type => (
                                        <MenuItem key={type} value={type}>{type.replace('_', ' ')}</MenuItem>
                                    ))}
                                </Select>
                                {errors.contractType && <FormHelperText>{errors.contractType}</FormHelperText>}
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth>
                                <InputLabel>Rate Code</InputLabel>
                                <Select
                                    value={formData.rateCode}
                                    onChange={handleChange('rateCode')}
                                    label="Rate Code"
                                >
                                    <MenuItem value="">None</MenuItem>
                                    {rateCodes.map(rate => (
                                        <MenuItem key={rate} value={rate}>{rate}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>

                    {/* Hours and Rest Days */}
                    <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                        Working Hours
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Min Hours per Week"
                                value={formData.minHrs}
                                onChange={handleChange('minHrs')}
                                error={!!errors.minHrs}
                                helperText={errors.minHrs}
                                inputProps={{ step: '0.01', min: '0' }}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Max Hours per Week"
                                value={formData.maxHrs}
                                onChange={handleChange('maxHrs')}
                                error={!!errors.maxHrs}
                                helperText={errors.maxHrs}
                                inputProps={{ step: '0.01', min: '0' }}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Rest Days per Cycle"
                                value={formData.restDays}
                                onChange={handleChange('restDays')}
                                error={!!errors.restDays}
                                helperText={errors.restDays}
                                inputProps={{ min: '0' }}
                            />
                        </Grid>
                    </Grid>

                    {/* Location Preferences with Weights */}
                    <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                        Location Preferences (with Weightage)
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth>
                                <InputLabel>Preferred Region</InputLabel>
                                <Select
                                    value={formData.preferredRegion}
                                    onChange={handleChange('preferredRegion')}
                                    label="Preferred Region"
                                >
                                    <MenuItem value="">None</MenuItem>
                                    {regions.map(region => (
                                        <MenuItem key={region} value={region}>{region}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>

                    {/* Add Preferred Service with Weight */}
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Add Preferred Location with Weight (0-100)
                        </Typography>
                        <Grid container spacing={2} alignItems="flex-start">
                            <Grid item xs={12} md={5}>
                                <Autocomplete
                                    freeSolo
                                    options={locations}
                                    value={newLocation}
                                    onChange={(e, value) => setNewLocation(value || '')}
                                    onInputChange={(e, value) => setNewLocation(value)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Location"
                                            placeholder="Type or select location"
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Weight (0-100)"
                                    value={newWeight}
                                    onChange={(e) => setNewWeight(e.target.value)}
                                    inputProps={{ min: '0', max: '100' }}
                                    helperText="100 = dedicated"
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={handleAddLocation}
                                    sx={{ height: 56 }}
                                >
                                    Add Location
                                </Button>
                            </Grid>
                        </Grid>
                        {errors.serviceWeights && (
                            <FormHelperText error>{errors.serviceWeights}</FormHelperText>
                        )}

                        {/* Display Added Locations */}
                        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {serviceWeights.map((sw) => (
                                <Chip
                                    key={sw.location}
                                    label={`${sw.location}: ${sw.weight}%`}
                                    onDelete={() => handleRemoveLocation(sw.location)}
                                    color={parseInt(sw.weight) === 100 ? 'primary' : 'default'}
                                />
                            ))}
                        </Box>
                    </Box>

                    {/* Restricted Services */}
                    <Grid container spacing={2} sx={{ mt: 2 }}>
                        <Grid item xs={12}>
                            <Autocomplete
                                multiple
                                freeSolo
                                options={locations}
                                value={formData.restrictedService}
                                onChange={(e, value) => setFormData({ ...formData, restrictedService: value })}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Restricted Locations"
                                        placeholder="Add restricted locations"
                                    />
                                )}
                            />
                        </Grid>
                    </Grid>

                    {/* Days and Shifts Preferences */}
                    <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                        Day and Shift Preferences
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Autocomplete
                                multiple
                                options={daysOfWeek}
                                value={formData.preferredDays}
                                onChange={(e, value) => setFormData({ ...formData, preferredDays: value })}
                                renderInput={(params) => (
                                    <TextField {...params} label="Preferred Days" />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Autocomplete
                                multiple
                                options={daysOfWeek}
                                value={formData.restrictedDays}
                                onChange={(e, value) => setFormData({ ...formData, restrictedDays: value })}
                                renderInput={(params) => (
                                    <TextField {...params} label="Restricted Days" />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Autocomplete
                                multiple
                                options={shiftTypes}
                                value={formData.preferredShifts}
                                onChange={(e, value) => setFormData({ ...formData, preferredShifts: value })}
                                renderInput={(params) => (
                                    <TextField {...params} label="Preferred Shifts" />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Autocomplete
                                multiple
                                options={shiftTypes}
                                value={formData.restrictedShifts}
                                onChange={(e, value) => setFormData({ ...formData, restrictedShifts: value })}
                                renderInput={(params) => (
                                    <TextField {...params} label="Restricted Shifts" />
                                )}
                            />
                        </Grid>
                    </Grid>

                    {/* Skills (Free Text) */}
                    <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                        Skills
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Autocomplete
                                multiple
                                freeSolo
                                options={skillsList}
                                value={formData.skills}
                                onChange={(e, value) => setFormData({ ...formData, skills: value })}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Skills"
                                        placeholder="Type and press Enter to add skills"
                                    />
                                )}
                            />
                        </Grid>
                    </Grid>

                    {/* Work Pattern */}
                    <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                        Work Pattern (Optional)
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Days On"
                                value={formData.daysOn}
                                onChange={handleChange('daysOn')}
                                error={!!errors.daysOn}
                                helperText={errors.daysOn}
                                inputProps={{ min: '0' }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Days Off"
                                value={formData.daysOff}
                                onChange={handleChange('daysOff')}
                                error={!!errors.daysOff}
                                helperText={errors.daysOff}
                                inputProps={{ min: '0' }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Weeks On"
                                value={formData.weekOn}
                                onChange={handleChange('weekOn')}
                                error={!!errors.weekOn}
                                helperText={errors.weekOn}
                                inputProps={{ min: '0' }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Weeks Off"
                                value={formData.weekOff}
                                onChange={handleChange('weekOff')}
                                error={!!errors.weekOff}
                                helperText={errors.weekOff}
                                inputProps={{ min: '0' }}
                            />
                        </Grid>
                    </Grid>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
                        <Button
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            onClick={() => navigate('/employees')}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : (isEditMode ? 'Update Employee' : 'Create Employee')}
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Box>
    );
}
