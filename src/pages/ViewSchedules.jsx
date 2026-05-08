import { useState, useEffect, useRef, useMemo } from "react";
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Typography, Box, Tooltip, Button, CircularProgress,
  Badge, IconButton, AppBar, Toolbar, Chip, Snackbar, Alert
} from "@mui/material";
import {
  Save as SaveIcon,
  History as HistoryIcon,
  Undo as UndoIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  ArrowBack as ArrowBackIcon,
  Visibility,
  VisibilityOff,
  DeleteSweep as ClearAllIcon,
  Campaign as CampaignIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { useVirtualizer } from '@tanstack/react-virtual';
import FloatingEmployeeList from "./FloatingEmployeeList";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../api/endpoint';
import axiosInstance from '../components/axiosInstance';
import { calculateDuration } from '../utils/shiftCalculations';
import { setEmpSummary, buildAssignmentMap } from '../utils/scheduleData';
import { fetchCurrentSchedule, fetchScheduleVersion, fetchCurrentVersionMeta } from '../api/schedules';
import { publishUnallocatedShifts } from '../api/stats';
import { DroppableCell } from "../components/droppableCell";
import ScheduleRow from "../components/ScheduleRow";

// Import versioning components
import VersionHistorySidebar from '../components/Versionhistorysidebar';
import SaveScheduleDialog from '../components/SaveScheduleDialog';
import DiscardChangesDialog from '../components/DiscardChangesDialog';
import ConflictDialog from '../components/ConflictDialog';
// Add to imports at top
import BulkAssignmentModal from '../components/BulkAssignmentModal';

const weekdayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const emptyDatesByWeekday = () =>
  weekdayOrder.reduce((acc, day) => { acc[day] = []; return acc; }, {});

function LoadingSpinner() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100%" width="100%">
      <CircularProgress size={48} thickness={4} />
    </Box>
  );
}

export default function ViewSchedules() {
  // Existing state
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ message: '', opened: false });
  const [rotaData, setRotaData] = useState(null);
  const [assignmentMap, setAssignmentMap] = useState({});
  const [datesByWeekday, setDatesByWeekday] = useState(emptyDatesByWeekday);
  const [groupedAssignments, setGroupedAssignments] = useState({});
  const [summarizedEmpList, setSummarizedEmpList] = useState([]);
  const [highlighted, setHighlighted] = useState({});
  const [activeDragId, setActiveDragId] = useState(null);
  const [draggedEmployee, setDraggedEmployee] = useState(null);

  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictData, setConflictData] = useState(null);

  // Versioning state
  const [versionSidebarOpen, setVersionSidebarOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [originalAssignmentMap, setOriginalAssignmentMap] = useState({});
  const [pendingChanges, setPendingChanges] = useState([]);
  const [changeHighlights, setChangeHighlights] = useState({});
  const [viewingHistoricalVersion, setViewingHistoricalVersion] = useState(false);

  const [bulkAssignmentModal, setBulkAssignmentModal] = useState({
    open: false,
    employee: null,
    targetCellKey: null,
    location: null,
    shiftType: null,
  })

  // ✅ NEW: State for clearing assignments (front-end only)
  const [clearedCells, setClearedCells] = useState(new Set());

  const [publishing, setPublishing] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const parentRef = useRef(null);

  const handleBack = () => navigate('/paycycleSchedule');

  // Helper: Extract shift ID from cell key
  const getShiftIdFromCellKey = (cellKey) => {
    const parts = cellKey.split('|');

    // ✅ New format: location|shiftType|date|startTime|shiftId (5 parts)
    if (parts.length === 5) {
      return parts[4] ? Number(parts[4]) : null;
    }

    // Old format: location|shiftType|date|startTime (4 parts) - fallback
    const [location, shiftType, date, startTime] = parts;

    if (!rotaData?.shiftAssignmentList) {
      console.warn('No rotaData available for cell key:', cellKey);
      return null;
    }

    const assignment = rotaData.shiftAssignmentList.find(a => {
      const shift = a.shift;
      const template = shift?.shiftTemplate;

      if (!shift || !template) return false;

      return (
        template.location === location &&
        template.shiftType === shiftType &&
        shift.shiftStart === date &&
        template.startTime === startTime
      );
    });

    if (!assignment) {
      console.warn('No assignment found for cell key:', cellKey);
    }

    return assignment?.shift?.id || null;
  };

  // Convert version data to rotaData format
  const convertVersionToRotaData = (versionData) => {
    if (!versionData.assignments || versionData.assignments.length === 0) {
      console.warn('No assignments in version data');
      return {
        shiftAssignmentList: [],
        employeeList: rotaData?.employeeList || []
      };
    }

    // ✅ FIX: Include ALL shifts, even unassigned ones
    const assignments = versionData.assignments.map(a => {
      const shiftStartDate = a.shiftStart ?
        (typeof a.shiftStart === 'string' ? a.shiftStart.split('T')[0] : a.shiftStart) :
        null;

      return {
        id: a.assignmentId || `version-${a.shiftId}-${a.employeeId || 'unassigned'}`,
        shift: {
          id: a.shiftId,
          shiftStart: shiftStartDate,
          shiftEnd: a.shiftEnd ?
            (typeof a.shiftEnd === 'string' ? a.shiftEnd.split('T')[0] : a.shiftEnd) :
            null,
          shiftTemplate: {
            location: a.location,
            shiftType: a.shiftType,
            startTime: a.startTime || '00:00:00',
            endTime: a.endTime || '00:00:00',
          },
          durationInHours: calculateDuration(a.startTime, a.endTime),
        },
        // ✅ FIX: Employee can be null (unassigned shift)
        employee: a.employeeId ? {
          id: a.employeeId,
          firstName: a.employeeFirstName || 'Unknown',
          lastName: a.employeeLastName || '',
        } : null,  // ← null instead of undefined
      };
    });

    return {
      shiftAssignmentList: assignments,
      employeeList: rotaData?.employeeList || [],
    };
  };

  const loadSchedule = async (versionId = null, highlightChanges = false) => {
    setLoading(true);
    try {
      if (versionId) {
        const data = await fetchScheduleVersion(id, versionId, highlightChanges);
        setViewingHistoricalVersion(!data.version.isCurrent);
        setCurrentVersion(data.version);
        setRotaData(convertVersionToRotaData(data));
      } else {
        const data = await fetchCurrentSchedule(id);
        setViewingHistoricalVersion(false);
        setRotaData(data);
        setCurrentVersion(await fetchCurrentVersionMeta(id));
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to load schedule';
      setSnackbar({ message: errorMsg, opened: true });
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    if (!id) return;
    loadSchedule();
  }, [id]);

  const handlePublish = async () => {
    if (!id || publishing) return;
    setPublishing(true);
    try {
      const result = await publishUnallocatedShifts(id);
      if (result?.broadcastSent) {
        setSnackbar({ message: result.message || 'Broadcast sent', opened: true });
      } else {
        setSnackbar({ message: 'No unallocated shifts to publish', opened: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to publish';
      setSnackbar({ message: msg, opened: true });
    } finally {
      setPublishing(false);
    }
  };

  // Initialize data when rotaData loads
  useEffect(() => {
    if (!rotaData || !Array.isArray(rotaData.shiftAssignmentList)) return;
    if (rotaData.shiftAssignmentList.length === 0) return;

    const grouped = {};
    rotaData.shiftAssignmentList.forEach((assignment) => {
      const { location, shiftType } = assignment.shift.shiftTemplate;
      const key = `${location}|${shiftType}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(assignment);
    });

    setGroupedAssignments(grouped);

    const { assignmentMap: newMap, datesByWeekday: newDates } = buildAssignmentMap(
      rotaData.shiftAssignmentList,
      weekdayOrder
    );
    setAssignmentMap(newMap);
    setDatesByWeekday(newDates);

    // CRITICAL FIX: Only update originalAssignmentMap for CURRENT version
    // NOT for historical versions (historical versions should be read-only)
    const isCurrentVersion = currentVersion?.isCurrent !== false;

    if (Object.keys(originalAssignmentMap).length === 0 ||
      (!viewingHistoricalVersion && isCurrentVersion)) {
      setOriginalAssignmentMap(JSON.parse(JSON.stringify(newMap)));

    }

    // Always clear pending changes when viewing historical version
    if (viewingHistoricalVersion) {
      setPendingChanges([]);
      setChangeHighlights({});
    }

    const updated = setEmpSummary(rotaData.employeeList, rotaData.shiftAssignmentList);
    setSummarizedEmpList(updated);
  }, [rotaData, viewingHistoricalVersion, currentVersion?.isCurrent]);

  // Track changes
  useEffect(() => {
    if (Object.keys(originalAssignmentMap).length === 0) return;
    if (viewingHistoricalVersion) return;

    const changes = [];
    const highlights = {};

    const allCellKeys = new Set([
      ...Object.keys(originalAssignmentMap),
      ...Object.keys(assignmentMap)
    ]);

    allCellKeys.forEach(cellKey => {
      const original = originalAssignmentMap[cellKey] || [];
      const current = assignmentMap[cellKey] || [];

      const originalIds = new Set(original.map(e => e.id));
      const currentIds = new Set(current.map(e => e.id));

      currentIds.forEach(empId => {
        if (!originalIds.has(empId)) {
          const employee = current.find(e => e.id === empId);
          const shiftId = getShiftIdFromCellKey(cellKey);

          if (shiftId) {
            changes.push({
              cellKey,
              shiftId,
              oldEmployeeId: null,
              newEmployeeId: empId,
              changeReason: 'MANUAL_DRAG_DROP',
              changeType: 'ASSIGNED',
              employee
            });
            highlights[cellKey] = 'ASSIGNED';
          }
        }
      });

      originalIds.forEach(empId => {
        if (!currentIds.has(empId)) {
          const employee = original.find(e => e.id === empId);
          const shiftId = getShiftIdFromCellKey(cellKey);

          if (shiftId) {
            changes.push({
              cellKey,
              shiftId,
              oldEmployeeId: empId,
              newEmployeeId: null,
              changeReason: 'MANUAL_REMOVE',
              changeType: 'UNASSIGNED',
              employee
            });
            highlights[cellKey] = 'UNASSIGNED';
          }
        }
      });

      if (original.length > 0 && current.length > 0 &&
        original.length === 1 && current.length === 1 &&
        original[0].id !== current[0].id) {
        const shiftId = getShiftIdFromCellKey(cellKey);

        if (shiftId) {
          changes.push({
            cellKey,
            shiftId,
            oldEmployeeId: original[0].id,
            newEmployeeId: current[0].id,
            changeReason: 'MANUAL_DRAG_DROP',
            changeType: 'REASSIGNED',
            oldEmployee: original[0],
            newEmployee: current[0]
          });
          highlights[cellKey] = 'REASSIGNED';
        }
      }
    });

    setPendingChanges(changes);
    setChangeHighlights(highlights);
  }, [assignmentMap, originalAssignmentMap, viewingHistoricalVersion]);

  const rowData = useMemo(() => {
    return Object.entries(groupedAssignments)
      .map(([key, assignments]) => {
        const [location, shiftType] = key.split("|");
        return {
          key,
          location,
          shiftType,
          assignments
        };
      })
      .sort((a, b) => {
        // Primary sort: by location (alphabetically)
        const locCompare = a.location.localeCompare(b.location);
        if (locCompare !== 0) return locCompare;

        // Secondary sort: by shift type (if same location)
        return a.shiftType.localeCompare(b.shiftType);
      });
  }, [groupedAssignments]);

  const rowVirtualizer = useVirtualizer({
    count: rowData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
    overscan: 5,
  });

  const handleRemove = (cellKey, emp) => {

    const [location, shiftType, date, shiftTime, shiftId] = cellKey.split("|");

    setAssignmentMap((prev) => {
      const current = prev[cellKey] ?? [];
      const updated = current.filter((e) => e.id !== emp.id);
      return { ...prev, [cellKey]: updated };
    });

    setSummarizedEmpList((prevList) => {
      return prevList.map((e) => {
        if (e.id === emp.id) {
          const summary = e.shiftTypeSummary?.[shiftType] || { count: 0, hours: 0 };

          const matchingAssignment = rotaData.shiftAssignmentList.find(
            (a) =>
              a.shift.shiftTemplate.shiftType === shiftType &&
              a.shift.shiftTemplate.startTime === shiftTime &&
              a.shift.shiftTemplate.location === location &&
              a.shift.shiftStart === date
          );

          const duration = matchingAssignment?.shift?.durationInHours || 0;
          const updatedSummary = { ...e.shiftTypeSummary };
          const newCount = Math.max(0, summary.count - 1);
          const newHours = Math.max(0, summary.hours - duration);

          if (newCount === 0 && newHours === 0) {
            delete updatedSummary[shiftType];
          } else {
            updatedSummary[shiftType] = { count: newCount, hours: newHours };
          }

          return { ...e, shiftTypeSummary: updatedSummary };
        }
        return e;
      });
    });

    setHighlighted((prev) => {
      const current = prev[cellKey] ?? [];
      const updated = current.filter((e) => e.id !== emp.id);
      return { ...prev, [cellKey]: updated };
    });
  };

  function handleDragStart({ active }) {
    setActiveDragId(active.id);
    const [, empIdStr] = active.id.split("|");
    const empId = Number(empIdStr);
    const emp = summarizedEmpList.find((e) => e.id === empId);
    setDraggedEmployee(emp);
  }

  const checkForConflicts = (employeeId, targetDate, targetCellKey) => {
    const conflicts = [];

    // Parse target shift details
    const targetParts = targetCellKey.split('|');
    if (targetParts.length !== 5) return conflicts;

    const [targetLocation, targetShiftType, , , targetShiftId] = targetParts;

    // Get all shifts for this employee on the same day (including target)
    const shiftsOnDay = [];

    // Add existing assignments
    Object.entries(assignmentMap).forEach(([cellKey, employees]) => {
      if (cellKey === targetCellKey) return; // Skip target itself

      const parts = cellKey.split('|');
      if (parts.length !== 5) return;

      const [location, shiftType, date, startTime, shiftId] = parts;

      if (date !== targetDate) return; // Different day

      const isAssigned = employees.some(emp => emp.id === employeeId);
      if (!isAssigned) return; // Employee not assigned

      shiftsOnDay.push({ location, shiftType, date, startTime, shiftId });
    });

    // Add the target shift we're trying to assign
    shiftsOnDay.push({
      location: targetLocation,
      shiftType: targetShiftType,
      date: targetDate,
      startTime: targetParts[3],
      shiftId: targetShiftId
    });

    // ✅ NOW CHECK: Are these shift types allowed on the same day?
    if (!isAllowedDayShiftTypes(shiftsOnDay)) {
      // Return conflicts ONLY if the combination is invalid
      return shiftsOnDay
        .filter(s => s.shiftId !== targetShiftId) // Don't include target in conflict list
        .map(shift => {
          const assignment = rotaData.shiftAssignmentList.find(a =>
            a.shift.id === parseInt(shift.shiftId)
          );

          return {
            location: shift.location,
            shiftType: shift.shiftType,
            date: shift.date,
            startTime: assignment?.shift.shiftTemplate.startTime || shift.startTime,
            endTime: assignment?.shift.shiftTemplate.endTime || '',
            shiftId: shift.shiftId
          };
        });
    }

    return []; // No conflicts - combination is valid
  };

  // function handleDragEnd({ active, over }) {
  //   setActiveDragId(null);
  //   setDraggedEmployee(null);

  //   if (!over) return;

  //   const [, empIdStr] = active.id.split("|");
  //   const empId = Number(empIdStr);
  //   const droppedEmp = summarizedEmpList.find((e) => e.id === empId);
  //   if (!droppedEmp) return;

  //   const [, location, shiftType, date, shiftTime, shiftId] = over.id.split("|");
  //   const cellKey = `${location}|${shiftType}|${date}|${shiftTime}|${shiftId}`;

  //   // ✅ CHECK FOR CONFLICTS BEFORE ASSIGNMENT
  //   const conflicts = checkForConflicts(empId, date, cellKey);

  //   if (conflicts.length > 0) {
  //     // Show conflict dialog
  //     const targetAssignment = rotaData.shiftAssignmentList.find(a =>
  //       a.shift.id === parseInt(shiftId)
  //     );

  //     setConflictData({
  //       employee: droppedEmp,
  //       targetShift: {
  //         location,
  //         shiftType,
  //         date,
  //         startTime: targetAssignment?.shift.shiftTemplate.startTime || shiftTime,
  //         endTime: targetAssignment?.shift.shiftTemplate.endTime || '',
  //       },
  //       conflictingShifts: conflicts
  //     });
  //     setConflictDialogOpen(true);

  //     // ❌ STOP HERE - Don't assign
  //     return;
  //   }

  //   // ✅ NO CONFLICTS - Proceed with assignment
  //   setAssignmentMap((prev) => {
  //     const current = prev[cellKey] ?? [];
  //     const alreadyAssigned = current.some((e) => e.id === droppedEmp.id);
  //     if (alreadyAssigned) return prev;

  //     return { ...prev, [cellKey]: [...current, droppedEmp] };
  //   });

  //   setSummarizedEmpList((prevList) => {
  //     return prevList.map((e) => {
  //       if (e.id === empId) {
  //         const summary = e.shiftTypeSummary?.[shiftType] || { count: 0, hours: 0 };

  //         const matchingAssignment = rotaData.shiftAssignmentList.find((a) =>
  //           a.shift.shiftTemplate.shiftType === shiftType &&
  //           a.shift.shiftTemplate.startTime === shiftTime &&
  //           a.shift.shiftTemplate.location === location &&
  //           a.shift.shiftStart === date
  //         );

  //         const duration = matchingAssignment?.shift?.durationInHours || 0;

  //         return {
  //           ...e,
  //           shiftTypeSummary: {
  //             ...e.shiftTypeSummary,
  //             [shiftType]: {
  //               count: summary.count + 1,
  //               hours: summary.hours + duration
  //             }
  //           }
  //         };
  //       }
  //       return e;
  //     });
  //   });

  //   setHighlighted((prev) => {
  //     const current = prev[cellKey] ?? [];
  //     const alreadyAssigned = current.some((e) => e.id === droppedEmp.id);
  //     if (alreadyAssigned) return prev;
  //     return { ...prev, [cellKey]: [...current, droppedEmp] };
  //   });
  // }
  function handleDragEnd({ active, over }) {
    setActiveDragId(null);
    setDraggedEmployee(null);

    if (!over) return;

    const [, empIdStr] = active.id.split("|");
    const empId = Number(empIdStr);
    const droppedEmp = summarizedEmpList.find((e) => e.id === empId);
    if (!droppedEmp) return;

    const [, location, shiftType, date, shiftTime, shiftId] = over.id.split("|");
    const cellKey = `${location}|${shiftType}|${date}|${shiftTime}|${shiftId}`;

    // ✅ CHECK FOR CONFLICTS BEFORE OPENING MODAL
    const conflicts = checkForConflicts(empId, date, cellKey);

    if (conflicts.length > 0) {
      // Show conflict dialog
      const targetAssignment = rotaData.shiftAssignmentList.find(a =>
        a.shift.id === parseInt(shiftId)
      );

      setConflictData({
        employee: droppedEmp,
        targetShift: {
          location,
          shiftType,
          date,
          startTime: targetAssignment?.shift.shiftTemplate.startTime || shiftTime,
          endTime: targetAssignment?.shift.shiftTemplate.endTime || '',
        },
        conflictingShifts: conflicts
      });
      setConflictDialogOpen(true);
      return;
    }

    // ✅ NO CONFLICTS - Open bulk assignment modal
    setBulkAssignmentModal({
      open: true,
      employee: droppedEmp,
      targetCellKey: cellKey,
      location,
      shiftType,
    });
  }

  const handleBulkAssignment = (selectedCellKeys, overrideInfo) => {
    const employee = bulkAssignmentModal.employee;

    selectedCellKeys.forEach((cellKey, index) => {
      const [location, shiftType, date, shiftTime, shiftId] = cellKey.split('|');
      const override = overrideInfo[index];

      // ✅ OVERRIDE: Remove existing employees if needed
      if (override.shouldOverride) {
        setAssignmentMap((prev) => {
          // Remove all other employees, keep only the new one
          return { ...prev, [cellKey]: [employee] };
        });

        // Update summaries for removed employees
        const currentAssignments = assignmentMap[cellKey] || [];
        currentAssignments.forEach(removedEmp => {
          if (removedEmp.id === employee.id) return; // Skip if same employee

          setSummarizedEmpList((prevList) => {
            return prevList.map((e) => {
              if (e.id === removedEmp.id) {
                const summary = e.shiftTypeSummary?.[shiftType] || { count: 0, hours: 0 };
                const matchingAssignment = rotaData.shiftAssignmentList.find((a) =>
                  a.shift.shiftTemplate.shiftType === shiftType &&
                  a.shift.shiftTemplate.startTime === shiftTime &&
                  a.shift.shiftTemplate.location === location &&
                  a.shift.shiftStart === date
                );
                const duration = matchingAssignment?.shift?.durationInHours || 0;

                const updatedSummary = { ...e.shiftTypeSummary };
                const newCount = Math.max(0, summary.count - 1);
                const newHours = Math.max(0, summary.hours - duration);

                if (newCount === 0 && newHours === 0) {
                  delete updatedSummary[shiftType];
                } else {
                  updatedSummary[shiftType] = { count: newCount, hours: newHours };
                }

                return { ...e, shiftTypeSummary: updatedSummary };
              }
              return e;
            });
          });
        });
      } else {
        // ✅ NORMAL: Add employee to existing assignments
        setAssignmentMap((prev) => {
          const current = prev[cellKey] ?? [];
          const alreadyAssigned = current.some((e) => e.id === employee.id);
          if (alreadyAssigned) return prev;

          return { ...prev, [cellKey]: [...current, employee] };
        });
      }

      // Update employee summary for NEW assignment
      setSummarizedEmpList((prevList) => {
        return prevList.map((e) => {
          if (e.id === employee.id) {
            const summary = e.shiftTypeSummary?.[shiftType] || { count: 0, hours: 0 };

            const matchingAssignment = rotaData.shiftAssignmentList.find((a) =>
              a.shift.shiftTemplate.shiftType === shiftType &&
              a.shift.shiftTemplate.startTime === shiftTime &&
              a.shift.shiftTemplate.location === location &&
              a.shift.shiftStart === date
            );

            const duration = matchingAssignment?.shift?.durationInHours || 0;

            return {
              ...e,
              shiftTypeSummary: {
                ...e.shiftTypeSummary,
                [shiftType]: {
                  count: summary.count + 1,
                  hours: summary.hours + duration
                }
              }
            };
          }
          return e;
        });
      });

      // Update highlighted
      if (override.shouldOverride) {
        setHighlighted((prev) => {
          return { ...prev, [cellKey]: [employee] };
        });
      } else {
        setHighlighted((prev) => {
          const current = prev[cellKey] ?? [];
          const alreadyAssigned = current.some((e) => e.id === employee.id);
          if (alreadyAssigned) return prev;
          return { ...prev, [cellKey]: [...current, employee] };
        });
      }
    });

    // Close modal
    setBulkAssignmentModal({ open: false, employee: null, targetCellKey: null, location: null, shiftType: null });
  };


  function handleDragCancel() {
    setActiveDragId(null);
    setDraggedEmployee(null);
  }



  const handleDiscardChanges = () => {
    setDiscardDialogOpen(true);
  };

  const handleConfirmDiscard = () => {
    setAssignmentMap(JSON.parse(JSON.stringify(originalAssignmentMap)));
    setPendingChanges([]);
    setChangeHighlights({});
    setHighlighted({});
    setSnackbar({ message: 'Changes discarded', opened: true });
  };

  // ✅ NEW: Clear all assignments (front-end only)
  const handleClearAllAssignments = () => {
    // Get all cell keys from assignmentMap
    const allCellKeys = Object.keys(assignmentMap);
    
    // Mark all cells as cleared
    setClearedCells(new Set(allCellKeys));
    
    setSnackbar({ message: 'All assignments hidden (front-end only)', opened: true });
  };

  // ✅ NEW: Restore all assignments
  const handleRestoreAllAssignments = () => {
    setClearedCells(new Set());
    setSnackbar({ message: 'All assignments restored', opened: true });
  };

  const handleClearAllActual = () => {
    setAssignmentMap((prev) => {
      const cleared = {};
      Object.keys(prev).forEach((key) => { cleared[key] = []; });
      return cleared;
    });
    setHighlighted({});
    setSummarizedEmpList((prev) => prev.map((e) => ({ ...e, shiftTypeSummary: {} })));
    setSnackbar({ message: 'All assignments cleared', opened: true });
  };

  const handleVersionSelect = (version) => {
    if (version) {
      loadSchedule(version.versionId, true);
    } else {
      loadSchedule();
    }
  };

  const handleSaveComplete = (versionData) => {
    setCurrentVersion(versionData.version);
    setOriginalAssignmentMap(JSON.parse(JSON.stringify(assignmentMap)));
    setPendingChanges([]);
    setChangeHighlights({});
    loadSchedule();
    setSnackbar({
      message: `Version ${versionData.version.versionNumber} saved successfully`,
      opened: true
    });
  };

  async function handleSave() {
    if (pendingChanges.length === 0) {
      setSnackbar({ message: 'No changes to save', opened: true });
      return;
    }

    if (viewingHistoricalVersion) {
      setSnackbar({
        message: 'Cannot save changes to historical version. Please rollback first.',
        opened: true
      });
      return;
    }

    setSaveDialogOpen(true);
  }

  const handleRefresh = () => {
    if (viewingHistoricalVersion && currentVersion) {
      loadSchedule(currentVersion.versionId);
    } else {
      loadSchedule();
    }
  };
  /**
 * Check if shift types are allowed on same day
 * Same business rules as backend validation
 */
  const isAllowedDayShiftTypes = (shifts) => {
    if (!shifts || shifts.length === 0) return true;
    if (shifts.length === 1) return true;

    const types = shifts.map(s => s.shiftType);
    const locations = shifts.map(s => s.location);

    // All FLOATING at different locations
    const allFloating = types.every(t => t === 'FLOATING');
    if (allFloating) {
      const uniqueLocs = new Set(locations);
      return uniqueLocs.size === locations.length;
    }

    // No mixing FLOATING with non-FLOATING
    const hasFloating = types.some(t => t === 'FLOATING');
    const hasNonFloating = types.some(t =>
      t === 'DAY' || t === 'LONG_DAY' || t === 'WAKING_NIGHT' || t === 'SLEEP_IN'
    );

    if (hasFloating && hasNonFloating) {
      return false;
    }

    // ✅ CRITICAL: LONG_DAY + SLEEP_IN at SAME location is ALLOWED
    if (shifts.length === 2) {
      const hasLongDay = types.includes('LONG_DAY');
      const hasSleepIn = types.includes('SLEEP_IN');

      if (hasLongDay && hasSleepIn) {
        // Check if both at same location
        const longDayLoc = shifts.find(s => s.shiftType === 'LONG_DAY')?.location;
        const sleepInLoc = shifts.find(s => s.shiftType === 'SLEEP_IN')?.location;

        return longDayLoc === sleepInLoc; // ✅ Valid if same location
      }
    }

    // Any other 2+ non-floating is invalid
    if (shifts.length >= 2 && !allFloating) {
      return false;
    }

    return true;
  };

  if (loading) {
    return <LoadingSpinner />
  }

  const virtualItems = rowVirtualizer.getVirtualItems();
  const columnWidths = [200, 150, 150, 150, 150, 150, 150, 150];

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton edge="start" onClick={handleBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {currentVersion ? currentVersion.versionLabel : 'Schedule View'}
            {currentVersion && (
              <Chip
                label={`v${currentVersion.versionNumber}`}
                size="small"
                sx={{ ml: 1 }}
                color={currentVersion.isCurrent ? 'success' : 'default'}
              />
            )}
          </Typography>

          {viewingHistoricalVersion && (
            <Alert severity="warning" sx={{ mr: 2 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <InfoIcon fontSize="small" />
                Viewing historical version (read-only)
              </Box>
            </Alert>
          )}

          {pendingChanges.length > 0 && (
            <Chip
              label={`${pendingChanges.length} pending changes`}
              color="warning"
              sx={{ mr: 2 }}
            />
          )}

          <Tooltip title="Refresh schedule">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Discard all changes">
            <span>
              <IconButton
                onClick={handleDiscardChanges}
                disabled={pendingChanges.length === 0 || viewingHistoricalVersion}
                color="error"
              >
                <UndoIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Clear all assignments">
            <span>
              <IconButton
                onClick={handleClearAllActual}
                disabled={viewingHistoricalVersion || Object.values(assignmentMap).every(v => v.length === 0)}
                color="error"
              >
                <ClearAllIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={clearedCells.size > 0 ? "Restore all assignments" : "Hide all assignments (front-end only)"}>
            <span>
              <IconButton
                onClick={clearedCells.size > 0 ? handleRestoreAllAssignments : handleClearAllAssignments}
                disabled={viewingHistoricalVersion}
                color={clearedCells.size > 0 ? "primary" : "default"}
              >
                {clearedCells.size > 0 ? <Visibility /> : <VisibilityOff />}
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Publish unallocated shifts">
            <span>
              <IconButton onClick={handlePublish} disabled={publishing || viewingHistoricalVersion}>
                <CampaignIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Version history">
            <IconButton onClick={() => setVersionSidebarOpen(true)}>
              <HistoryIcon />
            </IconButton>
          </Tooltip>

          <Badge badgeContent={pendingChanges.length} color="warning">
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={pendingChanges.length === 0 || viewingHistoricalVersion}
            >
              Save
            </Button>
          </Badge>
        </Toolbar>
      </AppBar>

      <Box sx={{
        paddingTop: 2,
        maxHeight: 'calc(100vh - 140px)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <TableContainer
          component={Paper}
          ref={parentRef}
          sx={{
            overflow: 'auto',
            maxHeight: 'calc(100vh - 250px)',
            position: 'relative',
          }}
        >
          <Box sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: '#f9f9f9',
            display: 'flex',
            borderBottom: '2px solid #ccc',
          }}>
            {["Location - Shift", ...weekdayOrder].map((label, i) => (
              <Box
                key={label}
                sx={{
                  width: columnWidths[i],
                  fontWeight: 'bold',
                  textAlign: i === 0 ? 'left' : 'center',
                  p: 1.5,
                  borderRight: i < columnWidths.length - 1 ? '1px solid #eee' : 'none',
                }}
              >
                {label}
              </Box>
            ))}
          </Box>

          <Box sx={{
            position: 'relative',
            height: `${rowVirtualizer.getTotalSize()}px`,
          }}>
            {virtualItems.map((virtualRow) => {
              const row = rowData[virtualRow.index];
              return (
                <ScheduleRow
                  key={virtualRow.key}
                  row={row}
                  columnWidths={columnWidths}
                  weekdayOrder={weekdayOrder}
                  datesByWeekday={datesByWeekday}
                  assignmentMap={assignmentMap}
                  highlighted={highlighted}
                  handleRemove={handleRemove}
                  activeDragId={activeDragId}
                  virtualRow={virtualRow}
                  measureElement={rowVirtualizer.measureElement}
                  changeHighlights={changeHighlights}
                  clearedCells={clearedCells}
                />
              );
            })}
          </Box>
        </TableContainer>
      </Box>

      <FloatingEmployeeList employees={summarizedEmpList || []} />

      <DragOverlay>
        {draggedEmployee ? (
          <Box sx={{
            px: 2,
            py: 1,
            borderRadius: 1,
            backgroundColor: "primary.main",
            color: "white",
            boxShadow: 3,
            cursor: "grabbing",
            fontWeight: "bold",
          }}>
            {draggedEmployee.firstName} {draggedEmployee.lastName}
          </Box>
        ) : null}
      </DragOverlay>

      <VersionHistorySidebar
        scheduleId={id}
        open={versionSidebarOpen}
        onClose={() => setVersionSidebarOpen(false)}
        onVersionSelect={handleVersionSelect}
        currentVersionId={currentVersion?.versionId}
      />

      <SaveScheduleDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        scheduleId={id}
        pendingChanges={pendingChanges}
        assignmentMap={assignmentMap}
        onSaveComplete={handleSaveComplete}
      />
      {/* ✅ Add Conflict Dialog */}
      <ConflictDialog
        open={conflictDialogOpen}
        onClose={() => {
          setConflictDialogOpen(false);
          setConflictData(null);
        }}
        employee={conflictData?.employee}
        targetShift={conflictData?.targetShift}
        conflictingShifts={conflictData?.conflictingShifts || []}
      />
      <Snackbar
        open={snackbar.opened}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, opened: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.message?.includes('fail') ? 'error' : 'success'}
          onClose={() => setSnackbar({ ...snackbar, opened: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      <DiscardChangesDialog
        open={discardDialogOpen}
        onClose={() => setDiscardDialogOpen(false)}
        onConfirm={handleConfirmDiscard}
        pendingChanges={pendingChanges}
      />
      {/* Add before </DndContext> closing tag, around line 850 */}
      <BulkAssignmentModal
        open={bulkAssignmentModal.open}
        onClose={() => setBulkAssignmentModal({
          open: false,
          employee: null,
          targetCellKey: null,
          location: null,
          shiftType: null
        })}
        employee={bulkAssignmentModal.employee}
        targetCellKey={bulkAssignmentModal.targetCellKey}
        location={bulkAssignmentModal.location}
        shiftType={bulkAssignmentModal.shiftType}
        datesByWeekday={datesByWeekday}
        assignmentMap={assignmentMap}
        rotaData={rotaData}
        checkForConflicts={checkForConflicts}
        onConfirm={handleBulkAssignment}
      />
    </DndContext>
  );
}