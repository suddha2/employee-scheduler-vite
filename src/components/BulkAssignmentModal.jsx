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
import { parseLocalDate } from '../utils/dates';

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
    checkForConflicts,
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

        // Count how many shiftAssignment rows share each shift.id -- that's
        // the slot count for that shift (backend returns one row per required
        // employee slot, including unallocated ones). We use this as a robust
        // empCount source because the shiftTemplate.empCount field is not
        // always populated on the schedule response.
        const slotCountByShiftId = new Map();
        rotaData.shiftAssignmentList.forEach((a) => {
            const id = a.shift.id;
            slotCountByShiftId.set(id, (slotCountByShiftId.get(id) || 0) + 1);
        });

        // Dedupe by shift.id so a shift with empCount>1 (multiple
        // shiftAssignment rows sharing the same shift.id) renders as one cell.
        const seen = new Set();
        return rotaData.shiftAssignmentList
            .filter(a =>
                a.shift.shiftTemplate.location === location &&
                a.shift.shiftTemplate.shiftType === shiftType
            )
            .filter(a => {
                if (seen.has(a.shift.id)) return false;
                seen.add(a.shift.id);
                return true;
            })
            .map(a => {
                const date = a.shift.shiftStart;
                const shiftStartTime = a.shift.shiftTemplate.startTime;
                const shiftId = a.shift.id;
                // Prefer the larger of the explicit template field and the
                // derived row count, then floor at 1. This works whether the
                // backend exposes empCount or not.
                const empCount = Math.max(
                    slotCountByShiftId.get(shiftId) || 0,
                    a.shift.shiftTemplate.empCount ?? 0,
                    1,
                );
                const cellKey = `${location}|${shiftType}|${date}|${shiftStartTime}|${shiftId}`;

                const currentlyAssigned = assignmentMap[cellKey] || [];
                const isAssignedToThisEmployee = currentlyAssigned.some(emp => emp.id === employee?.id);

                // Everyone OTHER than the dropped employee already on this slot.
                const assignedToOther = currentlyAssigned.filter(emp => emp.id !== employee?.id);
                const hasOtherAssignment = assignedToOther.length > 0;

                // True when the slot is full and the dropped employee isn't
                // already on it. Adding this employee would require evicting
                // one of the existing ones.
                const isFull = !isAssignedToThisEmployee && assignedToOther.length >= empCount;

                // True when this employee fits without displacing anyone --
                // either the slot is empty or has spare capacity.
                const hasRoomForMore = !isAssignedToThisEmployee && assignedToOther.length < empCount;

                const otherEmployeeNames = assignedToOther
                    .map(emp => `${emp.firstName} ${emp.lastName}`)
                    .join(', ');

                const hasConflict = !isAssignedToThisEmployee && employee && checkForConflicts
                    ? checkForConflicts(employee.id, date, cellKey).length > 0
                    : false;

                return {
                    cellKey,
                    date,
                    shiftStartTime,
                    shiftId,
                    empCount,
                    assignedCount: currentlyAssigned.length,
                    isAssignedToThisEmployee,
                    hasOtherAssignment,
                    hasRoomForMore,
                    isFull,
                    otherEmployeeNames,
                    hasConflict,
                };
            });
    }, [rotaData, location, shiftType, assignmentMap, employee, checkForConflicts]);

    // Build heat map grid data
    const heatMapData = useMemo(() => {
        const weekdayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const grid = {};

        if (availableCells.length === 0) return { grid, weekdayOrder, firstMonday: null };

        // Find the Monday of the week containing the earliest date.
        // Use parseLocalDate so that "YYYY-MM-DD" doesn't get parsed as UTC
        // midnight (which would shift the local date by one day in any
        // timezone behind UTC and push cells into the wrong week column).
        const sortedDates = [...new Set(availableCells.map(c => c.date))].sort();
        const firstDate = parseLocalDate(sortedDates[0]);
        const dayOfWeek = firstDate.getDay(); // 0=Sun, 1=Mon ... 6=Sat
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const firstMonday = new Date(firstDate);
        firstMonday.setDate(firstDate.getDate() - daysFromMonday);

        availableCells.forEach(cell => {
            const date = parseLocalDate(cell.date);
            const weekday = format(date, 'EEE');

            const diffDays = Math.round((date - firstMonday) / (1000 * 60 * 60 * 24));
            const weekNum = Math.floor(diffDays / 7) + 1;

            if (!grid[weekNum]) grid[weekNum] = {};
            // A single (week, weekday) bucket can hold multiple shifts when
            // a location has more than one shift of the same shiftType on the
            // same day (e.g. an early DAY 08:00–16:00 and a late DAY 14:00–22:00).
            // Keep them all -- the renderer stacks them inside the day cell.
            if (!grid[weekNum][weekday]) grid[weekNum][weekday] = [];
            grid[weekNum][weekday].push(cell);
        });

        // Sort each bucket by start time so the stacked shifts read chronologically.
        Object.values(grid).forEach(dayMap => {
            Object.values(dayMap).forEach(cells => {
                cells.sort((a, b) => (a.shiftStartTime || '').localeCompare(b.shiftStartTime || ''));
            });
        });

        return { grid, weekdayOrder, firstMonday };
    }, [availableCells]);

    // Counts: how many selected cells will result in new assignments, and of
    // those, how many will *displace* someone (slot already at empCount).
    const overrideStats = useMemo(() => {
        const selectedCellsArray = Array.from(selectedCells);
        const newAssignments = selectedCellsArray.filter(cellKey => {
            const cell = availableCells.find(c => c.cellKey === cellKey);
            return cell && !cell.isAssignedToThisEmployee;
        });
        const cellsToOverride = newAssignments.filter(cellKey => {
            const cell = availableCells.find(c => c.cellKey === cellKey);
            return cell?.isFull;
        });

        return {
            total: newAssignments.length,
            willOverride: cellsToOverride.length,
            cellsToOverride,
        };
    }, [selectedCells, availableCells]);

    const handleToggleCell = (cellKey, cell) => {
        if (cell.hasConflict) return;
        if (cell.isAssignedToThisEmployee) return;
        // A full slot is only selectable when override is explicitly allowed;
        // a partially-filled slot with room is always selectable (append).
        if (cell.isFull && !allowOverride) return;

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
            .filter(c => allowOverride || !c.isFull)
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

        // Only set shouldOverride when the slot is at capacity; partially-
        // filled slots get an APPEND in the parent rather than a replace.
        const overrideInfo = cellsToAssign.map(cellKey => {
            const cell = availableCells.find(c => c.cellKey === cellKey);
            return {
                cellKey,
                shouldOverride: cell?.isFull || false,
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

        const dateLabel = format(parseLocalDate(cell.date), 'MMM d');
        const slotLabel = cell.empCount > 1
            ? ` · ${cell.assignedCount}/${cell.empCount} slots filled`
            : '';

        if (cell.hasConflict) {
            return {
                display: '❌',
                color: 'error.light',
                disabled: true,
                tooltip: `${dateLabel} - Conflict with existing assignment`,
            };
        }

        if (isSelected) {
            if (cell.isFull) {
                return {
                    display: '⇄',
                    color: 'warning.main',
                    backgroundColor: 'warning.light',
                    disabled: false,
                    tooltip: `${dateLabel}${slotLabel} - Will replace: ${cell.otherEmployeeNames}`,
                };
            }
            return {
                display: '✓',
                color: 'primary.main',
                backgroundColor: 'primary.light',
                disabled: false,
                tooltip: `${dateLabel}${slotLabel}`,
            };
        }

        if (cell.isAssignedToThisEmployee) {
            return {
                display: '✓',
                color: 'success.main',
                backgroundColor: 'success.light',
                disabled: false,
                tooltip: `${dateLabel}${slotLabel} (already assigned to ${employee.firstName})`,
            };
        }

        if (cell.hasRoomForMore) {
            // Slot has spare capacity — appendable without override even if
            // someone else is already on it.
            if (cell.hasOtherAssignment) {
                return {
                    display: '+',
                    color: 'info.main',
                    backgroundColor: 'info.light',
                    disabled: false,
                    tooltip: `${dateLabel}${slotLabel} - Currently: ${cell.otherEmployeeNames} (click to add as additional employee)`,
                };
            }
            return {
                display: '□',
                color: 'grey.500',
                backgroundColor: 'grey.100',
                disabled: false,
                tooltip: `${dateLabel}${slotLabel}`,
            };
        }

        // cell.isFull from here on
        if (!allowOverride) {
            return {
                display: '🔒',
                color: 'grey.500',
                backgroundColor: 'grey.200',
                disabled: true,
                tooltip: `${dateLabel}${slotLabel} - Assigned to: ${cell.otherEmployeeNames} (enable override to replace)`,
            };
        }
        return {
            display: '○',
            color: 'warning.main',
            backgroundColor: 'warning.light',
            disabled: false,
            tooltip: `${dateLabel}${slotLabel} - Currently: ${cell.otherEmployeeNames} (click to override)`,
        };
    };

    if (!employee) return null;

    const { grid, weekdayOrder, firstMonday } = heatMapData;

    // Compute the calendar date for a given (week, weekday-index) coordinate.
    // Used to label every grid cell with its actual date — even empty ones,
    // where there's no `cell.date` available because no shift exists in that
    // slot. Mirrors the firstMonday-based offset that `heatMapData` itself uses
    // to bucket shifts into the grid, so empty and populated cells stay aligned.
    const getCellDate = (weekNum, weekdayIdx) => {
        if (!firstMonday) return null;
        const d = new Date(firstMonday);
        d.setDate(firstMonday.getDate() + (Number(weekNum) - 1) * 7 + weekdayIdx);
        return d;
    };
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
                                    Assign only to {format(parseLocalDate(targetCellKey.split('|')[2]), 'MMM d')}
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
                                            {weekdayOrder.map((day, weekdayIdx) => {
                                                const cells = grid[weekNum]?.[day] || [];
                                                // Resolve the actual calendar date for this grid coordinate.
                                                // Prefer the date attached to a real shift cell (always present
                                                // and authoritative); fall back to the firstMonday-based
                                                // computation for empty slots that have no `cell.date`.
                                                const cellDate = cells.length > 0
                                                    ? parseLocalDate(cells[0].date)
                                                    : getCellDate(weekNum, weekdayIdx);

                                                // Compact, neutrally-styled date pill that sits above each
                                                // cell's content. Small font, semi-bold, subtle background
                                                // tint so it reads as a "label" rather than competing with
                                                // the assignment indicator below.
                                                const dateLabel = cellDate ? (
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            fontSize: '0.65rem',
                                                            fontWeight: 600,
                                                            color: 'text.secondary',
                                                            letterSpacing: '0.03em',
                                                            textAlign: 'center',
                                                            lineHeight: 1,
                                                            mb: 0.5,
                                                            px: 0.5,
                                                            py: 0.25,
                                                            backgroundColor: 'action.hover',
                                                            borderRadius: 0.5,
                                                            alignSelf: 'center',
                                                            display: 'inline-block',
                                                        }}
                                                    >
                                                        {format(cellDate, 'MMM d')}
                                                    </Typography>
                                                ) : null;

                                                if (cells.length === 0) {
                                                    // No shift of this type on this day -- placeholder.
                                                    const cellStyle = getCellDisplay(null, false);
                                                    return (
                                                        <Tooltip key={day} title={cellStyle.tooltip} arrow>
                                                            <Box
                                                                sx={{
                                                                    p: 1,
                                                                    pt: 0.75,
                                                                    textAlign: 'center',
                                                                    fontSize: '1.2rem',
                                                                    backgroundColor: 'grey.100',
                                                                    color: cellStyle.color,
                                                                    border: '1px solid',
                                                                    borderColor: 'divider',
                                                                    borderRadius: 1,
                                                                    cursor: 'not-allowed',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'flex-start',
                                                                }}
                                                            >
                                                                {dateLabel}
                                                                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                                                                    {cellStyle.display}
                                                                </Box>
                                                            </Box>
                                                        </Tooltip>
                                                    );
                                                }

                                                const stacked = cells.length > 1;
                                                return (
                                                    <Box
                                                        key={day}
                                                        sx={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: 0.5,
                                                        }}
                                                    >
                                                        {dateLabel}
                                                        {cells.map((cell) => {
                                                            const isSelected = selectedCells.has(cell.cellKey);
                                                            const cellStyle = getCellDisplay(cell, isSelected);
                                                            return (
                                                                <Tooltip key={cell.cellKey} title={cellStyle.tooltip} arrow>
                                                                    <Box
                                                                        onClick={() => !cellStyle.disabled && handleToggleCell(cell.cellKey, cell)}
                                                                        sx={{
                                                                            p: stacked ? 0.5 : 2,
                                                                            textAlign: 'center',
                                                                            fontSize: stacked ? '0.9rem' : '1.2rem',
                                                                            backgroundColor: cellStyle.backgroundColor || 'grey.100',
                                                                            color: cellStyle.color,
                                                                            border: '1px solid',
                                                                            borderColor: 'divider',
                                                                            borderRadius: 1,
                                                                            cursor: cellStyle.disabled ? 'not-allowed' : 'pointer',
                                                                            transition: 'all 0.2s',
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            lineHeight: 1.2,
                                                                            '&:hover': cellStyle.disabled ? {} : {
                                                                                backgroundColor: 'primary.light',
                                                                                boxShadow: 3,
                                                                                borderColor: 'primary.main',
                                                                                zIndex: 1,
                                                                            },
                                                                        }}
                                                                    >
                                                                        {stacked && (
                                                                            <Typography
                                                                                variant="caption"
                                                                                sx={{ fontSize: '0.6rem', lineHeight: 1, mb: 0.25 }}
                                                                            >
                                                                                {cell.shiftStartTime?.slice(0, 5)}
                                                                            </Typography>
                                                                        )}
                                                                        {cellStyle.display}
                                                                    </Box>
                                                                </Tooltip>
                                                            );
                                                        })}
                                                    </Box>
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