import { useState, useEffect, useRef, useMemo, memo } from "react";
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
} from "@mui/icons-material";
import { format } from "date-fns";
import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { useVirtualizer } from '@tanstack/react-virtual';
import FloatingEmployeeList from "./FloatingEmployeeList";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../api/endpoint';
import axiosInstance from '../components/axiosInstance';
import { DroppableCell } from "../components/droppableCell";

// Import versioning components
import VersionHistorySidebar from '../components/Versionhistorysidebar';
import SaveScheduleDialog from '../components/SaveScheduleDialog';

const weekdayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const datesByWeekday = {};
weekdayOrder.forEach((day) => {
  datesByWeekday[day] = [];
});

// Helper: Calculate shift duration
const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;
  
  // Handle overnight shifts
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return (endMinutes - startMinutes) / 60;
};

function LoadingSpinner() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100%" width="100%">
      <CircularProgress size={48} thickness={4} />
    </Box>
  );
}

function buildAssignmentMap(assignments) {
  const map = {};
  const seen = {};

  assignments.forEach(({ shift, employee }) => {
    const location = shift.shiftTemplate.location;
    const shiftType = shift.shiftTemplate.shiftType;
    const date = shift.shiftStart;
    const shiftStartTime = shift.shiftTemplate.startTime;
    const shiftId = shift.id;
    const key = `${location}|${shiftType}|${date}|${shiftStartTime}|${shiftId}`;

    if (!map[key]) {
      map[key] = [];
      seen[key] = new Set();
    }

    if (employee && !seen[key].has(employee.id)) {
      map[key].push(employee);
      seen[key].add(employee.id);
    }
  });

  const uniqueDateStrings = Array.from(
    new Set(assignments.map((a) => a.shift.shiftStart))
  );

  // Clear existing dates before rebuilding
  Object.keys(datesByWeekday).forEach(day => {
    datesByWeekday[day] = [];
  });

  uniqueDateStrings.forEach((dateStr) => {
    const weekday = format(new Date(dateStr), "EEE");
    if (datesByWeekday[weekday]) {
      if (!datesByWeekday[weekday].includes(dateStr)) {
        datesByWeekday[weekday].push(dateStr);
      }
    }
  });

  // ✅ Sort dates within each weekday chronologically
  Object.keys(datesByWeekday).forEach(day => {
    datesByWeekday[day].sort((a, b) => new Date(a) - new Date(b));
  });

  return map;
}

function setEmpSummary(emplist, assignments) {
  const shiftTypeMap = {};

  assignments.forEach(({ shift, employee }) => {
    if (!employee) return;

    const empId = employee.id;
    const shiftType = shift.shiftTemplate.shiftType;

    if (!shiftTypeMap[empId]) {
      shiftTypeMap[empId] = {};
    }

    if (!shiftTypeMap[empId][shiftType]) {
      shiftTypeMap[empId][shiftType] = { count: 0, hours: 0 };
    }

    shiftTypeMap[empId][shiftType].count += 1;
    shiftTypeMap[empId][shiftType].hours += shift.durationInHours;
  });

  const updatedEmplist = emplist.map(emp => ({
    ...emp,
    shiftTypeSummary: shiftTypeMap[emp.id] || {}
  }));

  return updatedEmplist;
}

// Enhanced VirtualRow with change highlighting
const VirtualRow = memo(({ 
  row, 
  columnWidths, 
  weekdayOrder, 
  datesByWeekday, 
  assignmentMap, 
  highlighted, 
  handleRemove, 
  activeDragId,
  virtualRow,
  measureElement,
  changeHighlights
}) => {
  const { location, shiftType, assignments } = row;

  return (
    <Box
      ref={measureElement}
      data-index={virtualRow.index}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        transform: `translateY(${virtualRow.start}px)`,
        display: 'flex',
        borderBottom: '1px solid #ddd',
        backgroundColor: '#f3f0e1ff',
      }}
    >
      <Box sx={{ width: columnWidths[0], fontWeight: 'bold', p: 1, borderRight: '1px solid #eee' }}>
        {`${location} - ${shiftType.replaceAll("_", " ")}`}
      </Box>

      {weekdayOrder.map((day, i) => (
        <Box key={day} sx={{ width: columnWidths[i + 1], p: 1, borderRight: '1px solid #eee' }}>
          {datesByWeekday[day].map((date) => {
            const dateStr = date;
            const matching = assignments.filter((a) => {
              const shiftDateStr = format(new Date(a.shift.shiftStart), "yyyy-MM-dd");
              return shiftDateStr === dateStr;
            });

            // ✅ Dedupe by shift.id to avoid showing same shift multiple times
            const uniqueShifts = new Map();
            matching.forEach((assignment) => {
              const shiftId = assignment.shift.id;
              if (!uniqueShifts.has(shiftId)) {
                uniqueShifts.set(shiftId, assignment);
              }
            });

            return Array.from(uniqueShifts.values()).map((assignment) => {
              const shiftDateStr = format(new Date(assignment.shift.shiftStart), "yyyy-MM-dd");
              const shiftStartTime = assignment.shift.shiftTemplate.startTime;
              const shiftId = assignment.shift.id;
              const cellKey = `${location}|${shiftType}|${shiftDateStr}|${shiftStartTime}|${shiftId}`;
              const droppableId = `cell|${cellKey}`;
              const changeType = changeHighlights[cellKey];
              const cellEmployees = assignmentMap[cellKey] ?? [];

              return (
                <Box 
                  key={cellKey} 
                  sx={{ 
                    mb: 1,
                    borderLeft: changeType ? '4px solid' : 'none',
                    borderLeftColor: 
                      changeType === 'ASSIGNED' ? 'success.main' :
                      changeType === 'UNASSIGNED' ? 'error.main' :
                      changeType === 'REASSIGNED' ? 'info.main' : 'transparent',
                    pl: changeType ? 1 : 0,
                    backgroundColor: changeType ? 
                      (changeType === 'ASSIGNED' ? 'success.light' :
                       changeType === 'UNASSIGNED' ? 'error.light' :
                       'info.light') : 'transparent',
                    borderRadius: changeType ? 1 : 0,
                    opacity: changeType === 'UNASSIGNED' ? 0.6 : 1
                  }}
                >
                  <Typography variant="caption" fontWeight="bold" display="block">
                    {format(new Date(assignment.shift.shiftStart), "MMM d")}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    {assignment.shift.shiftTemplate.startTime.slice(0, 5)}-
                    {assignment.shift.shiftTemplate.endTime.slice(0, 5)}
                  </Typography>
                  <DroppableCell
                    id={droppableId}
                    assigned={cellEmployees}
                    highlighted={highlighted[cellKey] ?? []}
                    onRemove={handleRemove}
                    isDragging={!!activeDragId}
                  />
                  {changeType && (
                    <Chip 
                      label={changeType}
                      size="small"
                      color={
                        changeType === 'ASSIGNED' ? 'success' :
                        changeType === 'UNASSIGNED' ? 'error' : 'info'
                      }
                      sx={{ mt: 0.5, fontSize: '0.6rem' }}
                    />
                  )}
                </Box>
              );
            });
          })}
        </Box>
      ))}
    </Box>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.activeDragId === nextProps.activeDragId &&
    prevProps.row.key === nextProps.row.key &&
    prevProps.virtualRow.start === nextProps.virtualRow.start &&
    prevProps.assignmentMap === nextProps.assignmentMap &&
    prevProps.changeHighlights === nextProps.changeHighlights
  );
});

VirtualRow.displayName = 'VirtualRow';

export default function ViewSchedules() {
  // Existing state
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ message: '', opened: false });
  const [rotaData, setRotaData] = useState(null);
  const [assignmentMap, setAssignmentMap] = useState({});
  const [groupedAssignments, setGroupedAssignments] = useState({});
  const [summarizedEmpList, setSummarizedEmpList] = useState([]);
  const [highlighted, setHighlighted] = useState({});
  const [activeDragId, setActiveDragId] = useState(null);
  const [draggedEmployee, setDraggedEmployee] = useState(null);

  // Versioning state
  const [versionSidebarOpen, setVersionSidebarOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [originalAssignmentMap, setOriginalAssignmentMap] = useState({});
  const [pendingChanges, setPendingChanges] = useState([]);
  const [changeHighlights, setChangeHighlights] = useState({});
  const [viewingHistoricalVersion, setViewingHistoricalVersion] = useState(false);

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
        employee: a.employeeId ? {
          id: a.employeeId,
          firstName: a.employeeFirstName || 'Unknown',
          lastName: a.employeeLastName || '',
        } : null,
      };
    });

    console.log('Converted version data:', {
      assignmentCount: assignments.length,
      sample: assignments[0]
    });

    return {
      shiftAssignmentList: assignments,
      employeeList: rotaData?.employeeList || [],
    };
  };

  // Load schedule (with version support)
  const loadSchedule = async (versionId = null, highlightChanges = false) => {
    setLoading(true);
    try {
      let response;
      
      if (versionId) {
        console.log('Loading version:', versionId);
        response = await axiosInstance.get(
          `${API_ENDPOINTS.scheduleVersions}/${id}/versions/${versionId}`,
          {
            params: { highlightChanges },
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
        
        setViewingHistoricalVersion(!response.data.version.isCurrent);
        setCurrentVersion(response.data.version);
        
        const rotaDataFromVersion = convertVersionToRotaData(response.data);
        setRotaData(rotaDataFromVersion);
        
      } else {
        console.log('Loading current schedule');
        response = await axiosInstance.get(
          `${API_ENDPOINTS.solvedSchedule}?id=${id}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
        
        setViewingHistoricalVersion(false);
        setRotaData(response.data);
        
        try {
          const versionResponse = await axiosInstance.get(
            `${API_ENDPOINTS.scheduleVersions}/${id}/versions/current`,
            {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
          );
          setCurrentVersion(versionResponse.data.version);
        } catch (err) {
          console.log('No version metadata available');
          setCurrentVersion(null);
        }
      }
    } catch (err) {
      console.error('Failed to load schedule:', err);
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

    const newMap = buildAssignmentMap(rotaData.shiftAssignmentList);
    setAssignmentMap(newMap);
    
    // CRITICAL FIX: Only update originalAssignmentMap for CURRENT version
    // NOT for historical versions (historical versions should be read-only)
    const isCurrentVersion = currentVersion?.isCurrent !== false;
    
    if (Object.keys(originalAssignmentMap).length === 0 || 
        (!viewingHistoricalVersion && isCurrentVersion)) {
      setOriginalAssignmentMap(JSON.parse(JSON.stringify(newMap)));
      console.log('Updated originalAssignmentMap', {
        isCurrentVersion,
        viewingHistoricalVersion,
        versionNumber: currentVersion?.versionNumber
      });
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
    return Object.entries(groupedAssignments).map(([key, assignments]) => {
      const [location, shiftType] = key.split("|");
      return {
        key,
        location,
        shiftType,
        assignments
      };
    });
  }, [groupedAssignments]);

  const rowVirtualizer = useVirtualizer({
    count: rowData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
    overscan: 5,
  });

  const handleRemove = (emp, cellKey) => {
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

    setAssignmentMap((prev) => {
      const current = prev[cellKey] ?? [];
      const alreadyAssigned = current.some((e) => e.id === droppedEmp.id);
      if (alreadyAssigned) return prev;

      return { ...prev, [cellKey]: [...current, droppedEmp] };
    });

    setSummarizedEmpList((prevList) => {
      return prevList.map((e) => {
        if (e.id === empId) {
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

    setHighlighted((prev) => {
      const current = prev[cellKey] ?? [];
      const alreadyAssigned = current.some((e) => e.id === droppedEmp.id);
      if (alreadyAssigned) return prev;
      return { ...prev, [cellKey]: [...current, droppedEmp] };
    });
  }

  function handleDragCancel() {
    setActiveDragId(null);
    setDraggedEmployee(null);
  }

  const handleDiscardChanges = () => {
    if (window.confirm(`Discard ${pendingChanges.length} pending changes?`)) {
      setAssignmentMap(JSON.parse(JSON.stringify(originalAssignmentMap)));
      setPendingChanges([]);
      setChangeHighlights({});
      setHighlighted({});
      setSnackbar({ message: 'Changes discarded', opened: true });
    }
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
                <VirtualRow
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
    </DndContext>
  );
}