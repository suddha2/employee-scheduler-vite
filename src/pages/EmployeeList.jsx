import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    TextField,
    Button,
    IconButton,
    Chip,
    Typography,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Tooltip,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    FilterList as FilterIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../components/axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';

export default function EmployeeList() {
    // State management
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Pagination state
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    
    // Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRegion, setFilterRegion] = useState('');
    const [filterContractType, setFilterContractType] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    
    // Available filter options (fetch from backend or hardcode)
    const [regions, setRegions] = useState([]);
    const contractTypes = ['PERMANENT', 'ZERO_HOURS', 'FIXED_TERM', 'PART_TIME'];
    const genders = ['MALE', 'FEMALE', 'OTHER'];
    
    const navigate = useNavigate();

    // Fetch employees with pagination and filters
    const fetchEmployees = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const params = {
                page,
                size: rowsPerPage,
                search: searchTerm || undefined,
                region: filterRegion || undefined,
                contractType: filterContractType || undefined,
                gender: filterGender || undefined
            };

            const response = await axiosInstance.get(API_ENDPOINTS.employees, { params });
            
            setEmployees(response.data.content || response.data);
            setTotalElements(response.data.totalElements || response.data.length);
        } catch (err) {
            console.error('Failed to fetch employees:', err);
            setError('Failed to load employees. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch regions for filter dropdown
    const fetchRegions = async () => {
        try {
            const response = await axiosInstance.get(API_ENDPOINTS.locations);
            setRegions(response.data.map(loc => loc.region));
        } catch (err) {
            console.error('Failed to fetch regions:', err);
        }
    };

    useEffect(() => {
        fetchRegions();
    }, []);

    useEffect(() => {
        fetchEmployees();
    }, [page, rowsPerPage, searchTerm, filterRegion, filterContractType, filterGender]);

    // Event handlers
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
        setPage(0); // Reset to first page on search
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setFilterRegion('');
        setFilterContractType('');
        setFilterGender('');
        setPage(0);
    };

    const handleEdit = (id) => {
        navigate(`/employees/edit/${id}`);
    };

    const handleCreate = () => {
        navigate('/employees/create');
    };

    // Helper to format location preferences with weights
    const formatLocationPreferences = (preferredService) => {
        if (!preferredService || preferredService.length === 0) {
            return 'None';
        }
        
        return preferredService.map(service => {
            // Check if has weight format "Location:60"
            if (service.includes(':')) {
                return service; // Already formatted
            }
            return `${service}:100`; // Default to 100% if no weight
        }).join(', ');
    };

    // Helper to get contract type color
    const getContractTypeColor = (contractType) => {
        const colors = {
            'PERMANENT': 'success',
            'ZERO_HOURS': 'warning',
            'FIXED_TERM': 'info',
            'PART_TIME': 'default'
        };
        return colors[contractType] || 'default';
    };

    return (
        <Box sx={{ p: 3, mt: 8 }}>
            <Paper sx={{ p: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4">Employees</Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={handleCreate}
                    >
                        Add Employee
                    </Button>
                </Box>

                {/* Search and Filters */}
                <Box sx={{ mb: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        {/* Search */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                placeholder="Search by name..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                    endAdornment: searchTerm && (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setSearchTerm('')}>
                                                <ClearIcon />
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Grid>

                        {/* Filter Toggle */}
                        <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            <Button
                                variant="outlined"
                                startIcon={<FilterIcon />}
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                {showFilters ? 'Hide Filters' : 'Show Filters'}
                            </Button>
                            {(filterRegion || filterContractType || filterGender) && (
                                <Button
                                    variant="outlined"
                                    color="error"
                                    onClick={handleClearFilters}
                                >
                                    Clear All
                                </Button>
                            )}
                        </Grid>

                        {/* Filter Dropdowns */}
                        {showFilters && (
                            <>
                                <Grid item xs={12} md={4}>
                                    <FormControl fullWidth>
                                        <InputLabel>Region</InputLabel>
                                        <Select
                                            value={filterRegion}
                                            onChange={(e) => setFilterRegion(e.target.value)}
                                            label="Region"
                                        >
                                            <MenuItem value="">All Regions</MenuItem>
                                            {regions.map(region => (
                                                <MenuItem key={region} value={region}>{region}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <FormControl fullWidth>
                                        <InputLabel>Contract Type</InputLabel>
                                        <Select
                                            value={filterContractType}
                                            onChange={(e) => setFilterContractType(e.target.value)}
                                            label="Contract Type"
                                        >
                                            <MenuItem value="">All Types</MenuItem>
                                            {contractTypes.map(type => (
                                                <MenuItem key={type} value={type}>{type.replace('_', ' ')}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <FormControl fullWidth>
                                        <InputLabel>Gender</InputLabel>
                                        <Select
                                            value={filterGender}
                                            onChange={(e) => setFilterGender(e.target.value)}
                                            label="Gender"
                                        >
                                            <MenuItem value="">All Genders</MenuItem>
                                            {genders.map(gender => (
                                                <MenuItem key={gender} value={gender}>{gender}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </>
                        )}
                    </Grid>
                </Box>

                {/* Error Alert */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Loading State */}
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {/* Table */}
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>ID</strong></TableCell>
                                        <TableCell><strong>Name</strong></TableCell>
                                        <TableCell><strong>Gender</strong></TableCell>
                                        <TableCell><strong>Contract Type</strong></TableCell>
                                        <TableCell><strong>Hours (Min/Max)</strong></TableCell>
                                        <TableCell><strong>Region</strong></TableCell>
                                        <TableCell><strong>Preferred Locations</strong></TableCell>
                                        <TableCell align="center"><strong>Actions</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {employees.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center">
                                                <Typography variant="body1" color="textSecondary" sx={{ py: 4 }}>
                                                    No employees found. Try adjusting your filters or create a new employee.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        employees.map((employee) => (
                                            <TableRow key={employee.id} hover>
                                                <TableCell>{employee.id}</TableCell>
                                                <TableCell>
                                                    <Typography variant="body1">
                                                        {employee.firstName} {employee.lastName}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>{employee.gender}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={employee.contractType?.replace('_', ' ')}
                                                        color={getContractTypeColor(employee.contractType)}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {employee.minHrs || 0}h - {employee.maxHrs || 0}h
                                                </TableCell>
                                                <TableCell>{employee.preferredRegion || 'N/A'}</TableCell>
                                                <TableCell>
                                                    <Tooltip title={formatLocationPreferences(employee.preferredService)}>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                maxWidth: 200,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {formatLocationPreferences(employee.preferredService)}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title="Edit Employee">
                                                        <IconButton
                                                            color="primary"
                                                            onClick={() => handleEdit(employee.id)}
                                                        >
                                                            <EditIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Pagination */}
                        <TablePagination
                            component="div"
                            count={totalElements}
                            page={page}
                            onPageChange={handleChangePage}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            rowsPerPageOptions={[5, 10, 25, 50]}
                        />
                    </>
                )}
            </Paper>
        </Box>
    );
}
