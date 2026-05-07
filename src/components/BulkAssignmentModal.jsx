import React, { useState, useMemo, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    RadioGroup,
    FormControlLabel,
    Radio,
    Chip,
    Tooltip,
    Paper,
    Divider,
    Checkbox,
    Alert,
} from '@mui/material';
import {
    CheckCircle as CheckIcon,
    Cancel as CancelIcon,
    Warning as WarningIcon,
    SwapHoriz as OverrideIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

export default function BulkAssignmentModal({
    open,
    onClose,
    employee,
    targetCellKey,
    location,
    shiftType,
    datesByWeekday,
    assignmentMap,
    rotaData,
    onConfirm,
}) {
    const [assignmentMode, setAssignmentMode] = useState('single');
    const [selectedCells, setSelectedCells] = useState(new Set([targetCellKey]));
    const [allowOverride, setAllowOverride] = useState(false);

    useEffect(() => {
        if (open && targetCellKey) {
            setAssignmentMode('single');
            setSelectedCells(new Set([targetCellKey]));
            setAllowOverride(false);
        }
    }, [open, targetCellKey]);

    // Build available cells for this location + shiftType
    const availableCells = useMemo(() => {
        if (!rotaData?.shiftAssignmentList) return [];

        return rotaData.shiftAssignmentList
            .filter(a =>
                a.shift.shiftTemplate.location === location &&
                a.shift.shiftTemplate.shiftType === shiftType
            )
            .map(a => {
                const date = a.shift.shiftStart;
                const shiftStartTime = a.shift.shiftTemplate.startTime;
                const shiftId = a.shift.id;
                const cellKey = `${location}|${shiftType}|${date}|${shiftStartTime}|${shiftId}`;

                // Check if already assigned to THIS employee
                const isAssignedToThisEmployee = assignmentMap[cellKey]?.some(emp => emp.id === employee?.id);

                // Check if assigned to ANOTHER employee
                const assignedToOther = assignmentMap[cellKey]?.filter(emp => emp.id !== employee?.id) || [];
                const hasOtherAssignment = assignedToOther.length > 0;

                // Get names of other assigned employees
                const otherEmployeeNames = assignedToOther.map(emp => `${emp.firstName} ${emp.lastName}`).join(', ');

                // Check for conflicts (simplified - you can enhance this)
                const hasConflict = false; // TODO: Add conflict check if needed

                return {
                    cellKey,
                    date,
                    shiftStartTime,
                    shiftId,
                    isAssignedToThisEmployee,
                    hasOtherAssignment,
                    otherEmployeeNames,
                    hasConflict,
                };
            });
    }, [rotaData, location, shiftType, assignmentMap, employee]);

    // Build heat map grid data
    const heatMapData = useMemo(() => {
        const weekdayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const grid = {};

        if (availableCells.length === 0) return { grid, weekdayOrder };

        // Find the Monday of the week containing the earliest date
        const sortedDates = [...new Set(availableCells.map(c => c.date))].sort();
        const firstDate = new Date(sortedDates[0]);
        const dayOfWeek = firstDate.getDay(); // 0=Sun, 1=Mon ... 6=Sat
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const firstMonday = new Date(firstDate);
        firstMonday.setDate(firstDate.getDate() - daysFromMonday);
        firstMonday.setHours(0, 0, 0, 0);

        availableCells.forEach(cell => {
            const date = new Date(cell.date);
            date.setHours(0, 0, 0, 0);
            const weekday = format(date, 'EEE');

            const diffDays = Math.round((date - firstMonday) / (1000 * 60 * 60 * 24));
            const weekNum = Math.floor(diffDays / 7) + 1;

            if (!grid[weekNum]) {
                grid[weekNum] = {};
            }

            grid[weekNum][weekday] = cell;
        });

        return { grid, weekdayOrder };
    }, [availableCells]);

    // Calculate override statistics (only counts cells that will result in actual new assignments)
    const overrideStats = useMemo(() => {
        const selectedCellsArray = Array.from(selectedCells);
        const newAssignments = selectedCellsArray.filter(cellKey => {
            const cell = availableCells.find(c => c.cellKey === cellKey);
            return cell && !cell.isAssignedToThisEmployee;
        });
        const cellsWithOtherAssignments = newAssignments.filter(cellKey => {
            const cell = availableCells.find(c => c.cellKey === cellKey);
            return cell?.hasOtherAssignment;
        });

        return {
            total: newAssignments.length,
            willOverride: cellsWithOtherAssignments.length,
            cellsToOverride: cellsWithOtherAssignments,
        };
    }, [selectedCells, availableCells]);

    const handleToggleCell = (cellKey, cell) => {
        if (cell.hasConflict) return;
        if (cell.isAssignedToThisEmployee) return;
        if (cell.hasOtherAssignment && !allowOverride) return;

        setSelectedCells(prev => {
            const next = new Set(prev);
            if (next.has(cellKey)) {
                next.delete(cellKey);
            } else {
                next.add(cellKey);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        const validCells = availableCells
            .filter(c => !c.hasConflict)
            .filter(c => !c.isAssignedToThisEmployee)
            .filter(c => allowOverride || !c.hasOtherAssignment)
            .map(c => c.cellKey);
        setSelectedCells(new Set(validCells));
    };

    const handleClearAll = () => {
        setSelectedCells(new Set());
    };

    const handleConfirm = () => {
        const cellsToAssign = assignmentMode === 'single'
            ? [targetCellKey]
            : Array.from(selectedCells);

        // ✅ Build override info
        const overrideInfo = cellsToAssign.map(cellKey => {
            const cell = availableCells.find(c => c.cellKey === cellKey);
            return {
                cellKey,
                shouldOverride: cell?.hasOtherAssignment || false,
                replacedEmployees: cell?.otherEmployeeNames || '',
            };
        });

        onConfirm(cellsToAssign, overrideInfo);
        handleClose();
    };

    const handleClose = () => {
        // Reset to defaults
        setAssignmentMode('single');
        setSelectedCells(new Set([targetCellKey]));
        setAllowOverride(false); // ✅ Reset override
        onClose();
    };

    const getCellDisplay = (cell, isSelected) => {
        if (!cell) {
            return {
                display: '',
                color: 'grey.300',
                disabled: true,
                tooltip: 'No shift on this day',
            };
        }

        if (cell.hasConflict) {
            return {
                display: '❌',
                color: 'error.light',
                disabled: true,
                tooltip: 'Conflict with existing assignment',
            };
        }

        if (isSelected) {
            // ✅ Show override indicator if cell has other assignment
            if (cell.hasOtherAssignment) {
                return {
                    display: '⇄', // Override symbol
                    color: 'warning.main',
                    backgroundColor: 'warning.light',
                    disabled: false,
                    tooltip: `${format(new Date(cell.date), 'MMM d')} - Will replace: ${cell.otherEmployeeNames}`,
                };
            }

            return {
                display: '✓',
                color: 'primary.main',
                backgroundColor: 'primary.light',
                disabled: false,
                tooltip: format(new Date(cell.date), 'MMM d'),
            };
        }

        if (cell.isAssignedToThisEmployee) {
            return {
                display: '✓',
                color: 'success.main',
                backgroundColor: 'success.light',
                disabled: false,
                tooltip: `${format(new Date(cell.date), 'MMM d')} (already assigned to ${employee.firstName})`,
            };
        }

        if (cell.hasOtherAssignment) {
            // ✅ Show as blocked if override not allowed
            if (!allowOverride) {
                return {
                    display: '🔒',
                    color: 'grey.500',
                    backgroundColor: 'grey.200',
                    disabled: true,
                    tooltip: `${format(new Date(cell.date), 'MMM d')} - Assigned to: ${cell.otherEmployeeNames} (enable override to replace)`,
                };
            }

            return {
                display: '○',
                color: 'warning.main',
                backgroundColor: 'warning.light',
                disabled: false,
                tooltip: `${format(new Date(cell.date), 'MMM d')} - Currently: ${cell.otherEmployeeNames} (click to override)`,
            };
        }

        return {
            display: '□',
            color: 'grey.500',
            backgroundColor: 'grey.100',
            disabled: false,
            tooltip: format(new Date(cell.date), 'MMM d'),
        };
    };

    if (!employee) return null;

    const { grid, weekdayOrder } = heatMapData;
    const weeks = Object.keys(grid).sort((a, b) => Number(a) - Number(b));

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                <Box>
                    <Typography variant="h6" gutterBottom>
                        Assign {employee.firstName} {employee.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {location} - {shiftType.replaceAll('_', ' ')}
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent>
                <RadioGroup
                    value={assignmentMode}
                    onChange={(e) => setAssignmentMode(e.target.value)}
                >
                    <FormControlLabel
                        value="single"
                        control={<Radio />}
                        label={
                            <Box>
                                <Typography variant="body1">Single Assignment</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Assign only to {format(new Date(targetCellKey.split('|')[2]), 'MMM d')}
                                </Typography>
                            </Box>
                        }
                    />

                    <FormControlLabel
                        value="multiple"
                        control={<Radio />}
                        label={
                            <Box>
                                <Typography variant="body1">Multiple Assignment</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Select multiple dates to assign
                                </Typography>
                            </Box>
                        }
                    />
                </RadioGroup>

                {assignmentMode === 'multiple' && (
                    <Box sx={{ mt: 3 }}>
                        {/* ✅ Override Checkbox */}
                        <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={allowOverride}
                                        onChange={(e) => setAllowOverride(e.target.checked)}
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="body2" fontWeight="medium">
                                            Override existing assignments
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Replace employees already assigned to selected shifts
                                        </Typography>
                                    </Box>
                                }
                            />
                        </Paper>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle2">
                                Select dates ({overrideStats.total} new assignment{overrideStats.total !== 1 ? 's' : ''} selected)
                                {overrideStats.willOverride > 0 && (
                                    <Chip
                                        icon={<OverrideIcon />}
                                        label={`${overrideStats.willOverride} override${overrideStats.willOverride !== 1 ? 's' : ''}`}
                                        size="small"
                                        color="warning"
                                        sx={{ ml: 1 }}
                                    />
                                )}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button size="small" onClick={handleClearAll}>
                                    Clear All
                                </Button>
                                <Button size="small" onClick={handleSelectAll}>
                                    Select All
                                </Button>
                            </Box>
                        </Box>

                        {/* ✅ Override Warning */}
                        {overrideStats.willOverride > 0 && (
                            <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                    <strong>{overrideStats.willOverride} shift{overrideStats.willOverride !== 1 ? 's' : ''}</strong> will replace existing assignments
                                </Typography>
                            </Alert>
                        )}

                        {/* Heat Map Grid */}
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Box sx={{ overflowX: 'auto', overflowY: 'hidden' }}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'auto repeat(7, 1fr)', gap: 1, minWidth: 500, pb: 1, }}>
                                    {/* Header Row */}
                                    <Box sx={{ fontWeight: 'bold', textAlign: 'center', p: 1 }}>Week</Box>
                                    {weekdayOrder.map(day => (
                                        <Box key={day} sx={{ fontWeight: 'bold', textAlign: 'center', p: 1 }}>
                                            {day}
                                        </Box>
                                    ))}

                                    {/* Data Rows */}
                                    {weeks.map(weekNum => (
                                        <React.Fragment key={weekNum}>
                                            <Box sx={{ fontWeight: 'bold', textAlign: 'center', p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {weekNum}
                                            </Box>
                                            {weekdayOrder.map(day => {
                                                const cell = grid[weekNum]?.[day];
                                                const isSelected = cell && selectedCells.has(cell.cellKey);
                                                const cellStyle = getCellDisplay(cell, isSelected);

                                                return (
                                                    <Tooltip key={day} title={cellStyle.tooltip} arrow>
                                                        <Box
                                                            onClick={() => cell && !cellStyle.disabled && handleToggleCell(cell.cellKey, cell)}
                                                            sx={{
                                                                p: 2,
                                                                textAlign: 'center',
                                                                fontSize: '1.2rem',
                                                                backgroundColor: cellStyle.backgroundColor || 'grey.100',
                                                                color: cellStyle.color,
                                                                border: '1px solid',
                                                                borderColor: 'divider',
                                                                borderRadius: 1,
                                                                cursor: cellStyle.disabled ? 'not-allowed' : 'pointer',
                                                                transition: 'all 0.2s',
                                                                '&:hover': cellStyle.disabled ? {} : {
                                                                    backgroundColor: 'primary.light',
                                                                    boxShadow: 3,
                                                                    borderColor: 'primary.main',
                                                                    zIndex: 1,
                                                                },
                                                            }}
                                                        >
                                                            {cellStyle.display}
                                                        </Box>
                                                    </Tooltip>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </Box>
                            </Box>

                            {/* Legend */}
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                                <Chip icon={<CheckIcon />} label="Selected" size="small" color="primary" />
                                <Chip icon={<OverrideIcon />} label="Will Override" size="small" color="warning" />
                                <Chip icon={<CheckIcon />} label="Already Assigned (You)" size="small" color="success" />
                                <Chip label="🔒 Locked (Enable Override)" size="small" />
                                <Chip icon={<CancelIcon />} label="Conflict" size="small" color="error" />
                                <Chip label="Available" size="small" />
                            </Box>
                        </Paper>
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleConfirm}
                    disabled={assignmentMode === 'multiple' && overrideStats.total === 0}
                    color={overrideStats.willOverride > 0 ? 'warning' : 'primary'}
                >
                    {assignmentMode === 'single'
                        ? 'Assign Once'
                        : overrideStats.willOverride > 0
                            ? `Override & Assign to ${overrideStats.total} Shift${overrideStats.total !== 1 ? 's' : ''}`
                            : `Assign to ${overrideStats.total} Shift${overrideStats.total !== 1 ? 's' : ''}`
                    }
                </Button>
            </DialogActions>
        </Dialog>
    );
}