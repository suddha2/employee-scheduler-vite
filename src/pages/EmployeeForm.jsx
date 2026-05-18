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
    Divider,
    Backdrop
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
import { useServiceWeights } from '../hooks/useServiceWeights';
import { validateEmployee } from '../utils/employeeValidation';
import { parseServiceWeights, serializeServiceWeights } from '../utils/serviceWeights';
import ServiceWeightPicker from '../components/ServiceWeightPicker';

export default function EmployeeForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    // Form state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        gender: '',
        contractType: '',
        minHrs: '',
        maxHrs: '',
        rateCode: '',
        restDays: '',
        preferredRegion: '',
        preferredService: [],      // Services within region
        restrictedService: [],     // Services within region
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

    // [{location, weight}]; kept in sync with formData.preferredService by useServiceWeights.

    // UI state
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState({});
    const [loadingServices, setLoadingServices] = useState(false);

    // Dropdown options
    const [regions, setRegions] = useState([]);
    const [locations, setLocations] = useState([]);
    const [availableServices, setAvailableServices] = useState([]);  // Services for selected region
    const genders = ['MALE', 'FEMALE'];
    const contractTypes = ['PERMANENT', 'ZERO_HOURS'];
    const rateCodes = ['L1', 'L2', 'L3', 'ZERO_HOURS'];
    const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const shiftTypes = ['LONG_DAY', 'DAY', 'SLEEP_IN', 'WAKING_NIGHT', 'FLOATING', 'CARE_CALL'];
    const skillsList = ['BUCCAL', 'DRIVING'];

    // Fetch regions and locations on mount
    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const response = await axiosInstance.get(API_ENDPOINTS.locations);
                const regionsList = [...new Set(response.data.map(loc => loc.region))];
                const locationsList = response.data.map(loc => loc.name);
                setRegions(regionsList);
                setLocations(locationsList);
            } catch (err) {
                console.error('Failed to fetch locations:', err);
            }
        };
        fetchDropdownData();
    }, []);

    // Fetch services when preferred region changes
    useEffect(() => {
        if (formData.preferredRegion) {
            fetchServicesForRegion(formData.preferredRegion);
        } else {
            setAvailableServices([]);
            // Clear service selections if region is cleared
            setFormData(prev => ({
                ...prev,
                preferredService: [],
                restrictedService: []
            }));
        }
    }, [formData.preferredRegion]);

    const fetchServicesForRegion = async (region) => {
        setLoadingServices(true);
        try {
            // Update this endpoint to match your backend
            const response = await axiosInstance.get(`${API_ENDPOINTS.services}/${region}`);
            // Assuming response.data is array of service names: ["Service A", "Service B", ...]
            setAvailableServices(response.data);
        } catch (err) {
            console.error('Failed to fetch services:', err);
            setError('Failed to load services for selected region');
            setAvailableServices([]);
        } finally {
            setLoadingServices(false);
        }
    };

    // Get filtered services for Preferred Service dropdown
    const getAvailablePreferredServices = () => {
        // Exclude services already in restrictedService
        return availableServices.filter(
            service => !formData.restrictedService.includes(service)
        );
    };

    // Get filtered services for Restricted Service dropdown
    const getAvailableRestrictedServices = () => {
        // Exclude services already in preferredService
        return availableServices.filter(
            service => !formData.preferredService.includes(service)
        );
    };

    // Get filtered days for Preferred Days dropdown
    const getAvailablePreferredDays = () => {
        // Exclude days already in restrictedDays
        return daysOfWeek.filter(
            day => !formData.restrictedDays.includes(day)
        );
    };

    // Get filtered days for Restricted Days dropdown
    const getAvailableRestrictedDays = () => {
        // Exclude days already in preferredDays
        return daysOfWeek.filter(
            day => !formData.preferredDays.includes(day)
        );
    };

    // Get filtered shifts for Preferred Shifts dropdown
    const getAvailablePreferredShifts = () => {
        // Exclude shifts already in restrictedShifts
        return shiftTypes.filter(
            shift => !formData.restrictedShifts.includes(shift)
        );
    };

    // Get filtered shifts for Restricted Shifts dropdown
    const getAvailableRestrictedShifts = () => {
        // Exclude shifts already in preferredShifts
        return shiftTypes.filter(
            shift => !formData.preferredShifts.includes(shift)
        );
    };

    const [serviceWeights, setServiceWeights] = useServiceWeights(formData.preferredService);

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

            const { parsedWeights, serviceNames } = parseServiceWeights(employee);
            setServiceWeights(parsedWeights);

            setFormData({
                firstName: employee.firstName || '',
                lastName: employee.lastName || '',
                email: employee.email || '',
                gender: employee.gender || '',
                contractType: employee.contractType || '',
                minHrs: employee.minHrs ?? '',
                maxHrs: employee.maxHrs ?? '',
                rateCode: employee.rateCode || '',
                restDays: employee.restDays ?? '',
                preferredRegion: employee.preferredRegion || '',
                preferredService: serviceNames,  // Service names ONLY (no weights!)
                restrictedService: employee.restrictedService || [],
                preferredDays: employee.preferredDays || [],
                restrictedDays: employee.restrictedDays || [],
                preferredShifts: employee.preferredShifts || [],
                restrictedShifts: employee.restrictedShifts || [],
                skills: employee.skills || [],
                daysOn: employee.daysOn ?? '',
                daysOff: employee.daysOff ?? '',
                weekOn: employee.weekOn ?? '',
                weekOff: employee.weekOff ?? '',
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
        const newErrors = validateEmployee(formData, serviceWeights);
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

    // Handle service weight change
    const handleWeightChange = (service, newWeight) => {
        setServiceWeights(prev =>
            prev.map(sw =>
                sw.location === service
                    ? { ...sw, weight: newWeight }
                    : sw
            )
        );
    };

    // Handle service removal
    const handleRemoveService = (service) => {
        // Remove from serviceWeights
        setServiceWeights(serviceWeights.filter(sw => sw.location !== service));
        // Remove from preferredService field
        setFormData(prev => ({
            ...prev,
            preferredService: prev.preferredService.filter(s => s !== service)
        }));
    };

    // Handle Preferred Shifts change with LONG_DAY and SLEEP_IN pairing
    const handlePreferredShiftsChange = (e, value) => {
        let updatedShifts = [...value];

        // Check if LONG_DAY was added
        if (value.includes('LONG_DAY') && !formData.preferredShifts.includes('LONG_DAY')) {
            // Add SLEEP_IN if not already there
            if (!updatedShifts.includes('SLEEP_IN')) {
                updatedShifts.push('SLEEP_IN');
            }
        }

        // Check if SLEEP_IN was added
        if (value.includes('SLEEP_IN') && !formData.preferredShifts.includes('SLEEP_IN')) {
            // Add LONG_DAY if not already there
            if (!updatedShifts.includes('LONG_DAY')) {
                updatedShifts.push('LONG_DAY');
            }
        }

        // Check if LONG_DAY was removed
        if (!value.includes('LONG_DAY') && formData.preferredShifts.includes('LONG_DAY')) {
            // Remove SLEEP_IN as well
            updatedShifts = updatedShifts.filter(shift => shift !== 'SLEEP_IN');
        }

        // Check if SLEEP_IN was removed
        if (!value.includes('SLEEP_IN') && formData.preferredShifts.includes('SLEEP_IN')) {
            // Remove LONG_DAY as well
            updatedShifts = updatedShifts.filter(shift => shift !== 'LONG_DAY');
        }

        setFormData({ ...formData, preferredShifts: updatedShifts });
    };

    // Handle Restricted Shifts change with LONG_DAY and SLEEP_IN pairing
    const handleRestrictedShiftsChange = (e, value) => {
        let updatedShifts = [...value];

        // Check if LONG_DAY was added
        if (value.includes('LONG_DAY') && !formData.restrictedShifts.includes('LONG_DAY')) {
            // Add SLEEP_IN if not already there
            if (!updatedShifts.includes('SLEEP_IN')) {
                updatedShifts.push('SLEEP_IN');
            }
        }

        // Check if SLEEP_IN was added
        if (value.includes('SLEEP_IN') && !formData.restrictedShifts.includes('SLEEP_IN')) {
            // Add LONG_DAY if not already there
            if (!updatedShifts.includes('LONG_DAY')) {
                updatedShifts.push('LONG_DAY');
            }
        }

        // Check if LONG_DAY was removed
        if (!value.includes('LONG_DAY') && formData.restrictedShifts.includes('LONG_DAY')) {
            // Remove SLEEP_IN as well
            updatedShifts = updatedShifts.filter(shift => shift !== 'SLEEP_IN');
        }

        // Check if SLEEP_IN was removed
        if (!value.includes('SLEEP_IN') && formData.restrictedShifts.includes('SLEEP_IN')) {
            // Remove LONG_DAY as well
            updatedShifts = updatedShifts.filter(shift => shift !== 'LONG_DAY');
        }

        setFormData({ ...formData, restrictedShifts: updatedShifts });
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
            const payload = {
                ...formData,
                // Normalise so it matches the email the employee signs into the
                // mobile app with (the backend looks employees up by email).
                email: (formData.email || '').trim().toLowerCase(),
                preferredService: serializeServiceWeights(serviceWeights),
                restrictedService: formData.restrictedService,  // Services array
                // ✅ ADD THESE MAPPINGS:
                preferredShift: formData.preferredShifts || [],
                restrictedShift: formData.restrictedShifts || [],
                preferredDay: formData.preferredDays || [],
                restrictedDay: formData.restrictedDays || [],

                // ✅ REMOVE PLURAL VERSIONS:
                // preferredShifts: undefined,
                // restrictedShifts: undefined,
                // preferredDays: undefined,
                // restrictedDays: undefined,

                minHrs: formData.minHrs === '' ? null : parseFloat(formData.minHrs),
                maxHrs: formData.maxHrs === '' ? null : parseFloat(formData.maxHrs),
                restDays: formData.restDays === '' ? null : parseInt(formData.restDays),
                daysOn: formData.daysOn === '' ? null : parseInt(formData.daysOn),
                daysOff: formData.daysOff === '' ? null : parseInt(formData.daysOff),
                weekOn: formData.weekOn === '' ? null : parseInt(formData.weekOn),
                weekOff: formData.weekOff === '' ? null : parseInt(formData.weekOff),

            };
            console.log('Sending payload:', {
                preferredShift: payload.preferredShift,
                restrictedShift: payload.restrictedShift,
                preferredDay: payload.preferredDay,
                restrictedDay: payload.restrictedDay
            });
            if (isEditMode) {
                await axiosInstance.put(`${API_ENDPOINTS.employees}/${id}`, payload);
                setSuccess(true);
                setTimeout(() => navigate('/employees'), 3000);
            } else {
                await axiosInstance.post(API_ENDPOINTS.employees, payload);
                setSuccess(true);
                setTimeout(() => navigate('/employees'), 3000);
            }
        } catch (err) {
            console.error('Failed to save employee:', err);
            setError(err.response?.data?.message || 'Failed to save employee. Please try again.');
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
        <>
            <Backdrop
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    backdropFilter: 'blur(8px)',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)'
                }}
                open={saving}
            >
                <Paper
                    elevation={24}
                    sx={{
                        p: 5,
                        borderRadius: 3,
                        textAlign: 'center',
                        minWidth: 400,
                        backgroundColor: success ? '#f1f8f4' : 'white'
                    }}
                >
                    {success ? (
                        <>
                            <Box sx={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                backgroundColor: '#4caf50',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 24px'
                            }}>
                                <Typography variant="h2" sx={{ color: 'white' }}>✓</Typography>
                            </Box>
                            <Typography variant="h5" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600 }}>
                                Success!
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Employee {isEditMode ? 'updated' : 'created'} successfully
                            </Typography>
                        </>
                    ) : (
                        <>
                            <CircularProgress size={60} thickness={4} sx={{ mb: 3 }} />
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
                                {isEditMode ? 'Updating Employee' : 'Creating Employee'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Please wait...
                            </Typography>
                        </>
                    )}
                </Paper>
            </Backdrop>
            <Box sx={{ p: 3 }}>
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
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    required
                                    type="email"
                                    label="Email"
                                    value={formData.email}
                                    onChange={handleChange('email')}
                                    error={!!errors.email}
                                    helperText={errors.email || 'Used for mobile app sign-in'}
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

                        {/* Region and Services */}
                        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                            Region & Services
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth>
                                    <InputLabel>Preferred Region *</InputLabel>
                                    <Select
                                        value={formData.preferredRegion}
                                        onChange={handleChange('preferredRegion')}
                                        label="Preferred Region *"
                                    >
                                        <MenuItem value="">None</MenuItem>
                                        {regions.map(region => (
                                            <MenuItem key={region} value={region}>{region}</MenuItem>
                                        ))}
                                    </Select>
                                    <FormHelperText>Select region first to load services</FormHelperText>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth disabled={!formData.preferredRegion || loadingServices}>
                                    <Autocomplete
                                        multiple
                                        options={getAvailablePreferredServices()}
                                        value={formData.preferredService}
                                        onChange={(e, value) => setFormData({ ...formData, preferredService: value })}
                                        disabled={!formData.preferredRegion || loadingServices}
                                        getOptionLabel={(option) => {
                                            // Strip weight if present (safety measure)
                                            return typeof option === 'string' && option.includes(':')
                                                ? option.split(':')[0].trim()
                                                : option;
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Preferred Services"
                                                placeholder={
                                                    !formData.preferredRegion
                                                        ? "Select region first"
                                                        : loadingServices
                                                            ? "Loading services..."
                                                            : "Select services"
                                                }
                                            />
                                        )}
                                    />
                                    {loadingServices && <FormHelperText>Loading services...</FormHelperText>}
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth disabled={!formData.preferredRegion || loadingServices}>
                                    <Autocomplete
                                        multiple
                                        options={getAvailableRestrictedServices()}
                                        value={formData.restrictedService}
                                        onChange={(e, value) => setFormData({ ...formData, restrictedService: value })}
                                        disabled={!formData.preferredRegion || loadingServices}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Restricted Services"
                                                placeholder={
                                                    !formData.preferredRegion
                                                        ? "Select region first"
                                                        : loadingServices
                                                            ? "Loading services..."
                                                            : "Select services"
                                                }
                                            />
                                        )}
                                    />
                                </FormControl>
                            </Grid>
                        </Grid>

                        <ServiceWeightPicker
                            serviceWeights={serviceWeights}
                            error={errors.serviceWeights}
                            onWeightChange={handleWeightChange}
                            onRemoveService={handleRemoveService}
                        />


                        {/* Days and Shifts Preferences */}
                        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                            Day and Shift Preferences
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Autocomplete
                                    multiple
                                    options={getAvailablePreferredDays()}
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
                                    options={getAvailableRestrictedDays()}
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
                                    options={getAvailablePreferredShifts()}
                                    value={formData.preferredShifts}
                                    onChange={handlePreferredShiftsChange}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Preferred Shifts"
                                            helperText="LONG_DAY and SLEEP_IN are paired - selecting one adds the other"
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Autocomplete
                                    multiple
                                    options={getAvailableRestrictedShifts()}
                                    value={formData.restrictedShifts}
                                    onChange={handleRestrictedShiftsChange}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Restricted Shifts"
                                            helperText="LONG_DAY and SLEEP_IN are paired - selecting one adds the other"
                                        />
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
        </>
    );
}