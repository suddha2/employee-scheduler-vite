import { useState, useEffect, useRef, useMemo } from "react";
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Typography, Box, Tooltip, Button, CircularProgress,
  Badge, IconButton, AppBar, Toolbar, Chip, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
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
  WarningAmber as WarningAmberIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { useVirtualizer } from '@tanstack/react-virtual';
import FloatingEmployeeList from "./FloatingEmployeeList";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../api/endpoint';
import axiosInstance from '../components/axiosInstance';
import { useAuth } from '../contexts/AuthContext';
import { calculateDuration } from '../utils/shiftCalculations';
import { setEmpSummary, buildAssignmentMap } from '../utils/scheduleData';
import { isAllowedDayShiftTypes, findConflictCells } from '../utils/shiftConflicts';
import { fetchCurrentSchedule, fetchScheduleVersion, fetchCurrentVersionMeta } from '../api/schedules';
import { publishUnallocatedShifts } from '../api/stats';
import { DroppableCell } from "../components/droppableCell";
import ScheduleRow from "../components/ScheduleRow";
import ConflictsDrawer from "../components/ConflictsDrawer";

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
  // Role-gated capabilities — hide write controls and short-circuit drag-drop
  // when the current user can't edit. Server-side checks still enforce this
  // (and would return 403), this is just the matching UI.
  const { canEditSchedule, canPublishShifts } = useAuth();

  // Existing state
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ message: '', opened: false });
  const [rotaData, setRotaData] = useState(null);
  const [assignmentMap, setAssignmentMap] = useState({});
  const [datesByWeekday, setDatesByWeekday] = useState(emptyDatesByWeekday);
  const [pinnedMap, setPinnedMap] = useState({});
  // Locally-detected conflicts (same-employee double-bookings under
  // invalid same-day rules). Recomputed on every assignmentMap change.
  const localConflicts = useMemo(
    () => {
      const { conflictCells, cellInfo } = findConflictCells(assignmentMap);
      return { conflictCells, conflictCellInfo: cellInfo };
    },
    [assignmentMap]
  );

  // Backend-reported conflicts after a failed save (409). Stored as a Set
  // of shift ids -- the backend conflict shape varies (shiftId / shift.id /
  // id), so we extract whichever field is present and use the shiftId portion
  // of cellKeys to mark matching cells.
  const [backendConflictShiftIds, setBackendConflictShiftIds] = useState(new Set());
  const [backendConflictMessages, setBackendConflictMessages] = useState(new Map());
  const [conflictsDrawerOpen, setConflictsDrawerOpen] = useState(false);
  // findHighlightedEmpId: when set, every chip for this employee renders
  // with an amber outline so the admin can scan their assignments. The
  // floating Employees list also gets a search-driven UI to set/clear it.
  const [findHighlightedEmpId, setFindHighlightedEmpId] = useState(null);
  // clearTarget: opens the confirm dialog for "Clear all assignments" for
  // a specific employee. count is precomputed so the dialog can show it.
  const [clearTarget, setClearTarget] = useState(null);
  // unpinTarget: opens the confirm dialog for "Unpin" — counts the
  // employee's currently-pinned assignments, removes only the pin flag,
  // leaves the assignment in place. Mirrors clearTarget's shape.
  const [unpinTarget, setUnpinTarget] = useState(null);
  // selectedSlotKey: when an admin clicks an unassigned cell we mark its
  // cellKey here. The floating employees list then filters to employees who
  // have no other assignment on that date, so they're guaranteed-free for
  // the slot. Click again to toggle off, or use the chip's ×.
  const [selectedSlotKey, setSelectedSlotKey] = useState(null);

  const backendConflictCells = useMemo(() => {
    if (backendConflictShiftIds.size === 0) return { cells: new Set(), cellInfo: new Map() };
    const cells = new Set();
    const cellInfo = new Map();
    Object.keys(assignmentMap).forEach((cellKey) => {
      const parts = cellKey.split('|');
      if (parts.length !== 5) return;
      const shiftId = Number(parts[4]);
      if (backendConflictShiftIds.has(shiftId)) {
        cells.add(cellKey);
        const msg = backendConflictMessages.get(shiftId);
        cellInfo.set(cellKey, {
          employees: new Set([msg ? `Server: ${msg}` : 'Server rejected this shift']),
          peers: [],
        });
      }
    });
    return { cells, cellInfo };
  }, [assignmentMap, backendConflictShiftIds, backendConflictMessages]);

  // Merge local + backend conflict sources into one set the renderer reads.
  const conflictCells = useMemo(() => {
    if (backendConflictCells.cells.size === 0) return localConflicts.conflictCells;
    const merged = new Set(localConflicts.conflictCells);
    backendConflictCells.cells.forEach((k) => merged.add(k));
    return merged;
  }, [localConflicts.conflictCells, backendConflictCells.cells]);

  const conflictCellInfo = useMemo(() => {
    if (backendConflictCells.cellInfo.size === 0) return localConflicts.conflictCellInfo;
    const merged = new Map(localConflicts.conflictCellInfo);
    backendConflictCells.cellInfo.forEach((info, key) => {
      const existing = merged.get(key);
      if (existing) {
        info.employees.forEach((e) => existing.employees.add(e));
      } else {
        merged.set(key, info);
      }
    });
    return merged;
  }, [localConflicts.conflictCellInfo, backendConflictCells.cellInfo]);

  // Extract a shift id from one backend conflict entry. The server payload
  // may name the field differently across endpoints; try the common shapes.
  const extractShiftId = (conflict) => {
    const candidate = conflict?.shiftId
      ?? conflict?.shift?.id
      ?? conflict?.shiftAssignmentId
      ?? conflict?.id;
    const n = Number(candidate);
    return Number.isFinite(n) ? n : null;
  };

  const handleSaveConflict = ({ conflicts, message }) => {
    const shiftIds = new Set();
    const messages = new Map();
    (conflicts || []).forEach((c) => {
      const id = extractShiftId(c);
      if (id != null) {
        shiftIds.add(id);
        if (c?.message || c?.reason) {
          messages.set(id, c.message || c.reason);
        }
      }
    });
    setBackendConflictShiftIds(shiftIds);
    setBackendConflictMessages(messages);
    setSnackbar({
      message: shiftIds.size > 0
        ? `${message || 'Save failed'}: ${shiftIds.size} conflict${shiftIds.size === 1 ? '' : 's'} highlighted on the schedule.`
        : (message || 'Save failed: conflicts detected (no shift ids in response).'),
      opened: true,
    });
  };

  const clearBackendConflicts = () => {
    setBackendConflictShiftIds(new Set());
    setBackendConflictMessages(new Map());
  };
  const [groupedAssignments, setGroupedAssignments] = useState({});
  const [summarizedEmpList, setSummarizedEmpList] = useState([]);

  // Other-regions employees for the floating panel's "Other Regions" tab.
  // Lazily fetched on first tab open; null = not yet loaded, [] = loaded empty.
  // Reset whenever we navigate to a different schedule (the rota id changes).
  const [outOfRegionEmpList, setOutOfRegionEmpList] = useState(null);
  const [outOfRegionLoading, setOutOfRegionLoading] = useState(false);
  const [outOfRegionError, setOutOfRegionError] = useState(null);
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
  // Baseline copy of pinnedMap captured at load time. Used by the
  // pendingChanges memo to detect pin-only diffs (Unpin button) and by
  // handleConfirmDiscard to restore the original pin state on cancel.
  const [originalPinnedMap, setOriginalPinnedMap] = useState({});
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
    // Reset out-of-region cache when the rota changes — the data is keyed by
    // the current rota's paycycle period, so it's stale across schedules.
    setOutOfRegionEmpList(null);
    setOutOfRegionError(null);
    setOutOfRegionLoading(false);
  }, [id]);

  // Lazily fetched on first open of the "Other Regions" tab in the floating
  // panel. Dedupes automatically — once `outOfRegionEmpList` is set the tab
  // switch is a no-op.
  const handleRequestOutOfRegion = async () => {
    if (!id || outOfRegionLoading || outOfRegionEmpList != null) return;
    setOutOfRegionLoading(true);
    setOutOfRegionError(null);
    try {
      const res = await axiosInstance.get(API_ENDPOINTS.outOfRegionEmps, { params: { id } });
      setOutOfRegionEmpList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setOutOfRegionError(err?.message || 'Failed to load other-region employees');
      // Leave list null so a future tab toggle retries.
    } finally {
      setOutOfRegionLoading(false);
    }
  };

  // Look up an employee by id across both lists. Used by drag/drop handlers
  // and the highlight chip so an out-of-region drag still resolves.
  const findEmpById = (empId) => {
    return summarizedEmpList.find((e) => e.id === empId)
        || (outOfRegionEmpList || []).find((e) => e.id === empId)
        || null;
  };

  // Toggle the "highlight this employee's assignments" amber chip ring.
  const handleToggleFindHighlight = (empId) => {
    setFindHighlightedEmpId((prev) => (prev === empId ? null : empId));
  };

  // Click an unassigned cell -> select it. Click the same cell again ->
  // deselect. Only fires for cells that are actually empty (the cell
  // component gates on that).
  const handleSelectSlot = (cellKey) => {
    setSelectedSlotKey((prev) => (prev === cellKey ? null : cellKey));
  };

  // Derived: when a slot is selected, this carries the date + display label
  // and a Set of employee ids who already have *any* assignment on that date
  // (and so should be excluded from the floating list filter).
  const slotFilterInfo = useMemo(() => {
    if (!selectedSlotKey) return null;
    const parts = selectedSlotKey.split('|');
    if (parts.length !== 5) return null;
    const [location, shiftType, date, startTime] = parts;

    const busyIds = new Set();
    Object.entries(assignmentMap).forEach(([cellKey, employees]) => {
      const p = cellKey.split('|');
      if (p.length !== 5) return;
      if (p[2] !== date) return;
      employees.forEach((e) => busyIds.add(e.id));
    });

    return {
      cellKey: selectedSlotKey,
      date,
      location,
      shiftType,
      startTime: (startTime || '').slice(0, 5),
      busyIds,
    };
  }, [selectedSlotKey, assignmentMap]);

  // Count this employee's current allocations and open the confirm dialog.
  // If they have none, just toast — no point bringing up a dialog.
  const handleAskClearAll = (employee) => {
    let count = 0;
    Object.values(assignmentMap).forEach((emps) => {
      if (emps.some((e) => e.id === employee.id)) count += 1;
    });
    if (count === 0) {
      setSnackbar({
        message: `${employee.firstName} ${employee.lastName} has no assignments to clear.`,
        opened: true,
      });
      return;
    }
    setClearTarget({ employee, count });
  };

  // Count this employee's currently-pinned assignments and open the
  // unpin-confirm dialog. Toast and bail if there are none.
  //
  // "Unpin" releases the pin lock on every cell where this employee is
  // both assigned and currently pinned — leaving the allocation intact
  // so the next solve can move them but the current rota still has them
  // sitting where they were. The change is queued through pendingChanges
  // like Clear-all does, so Save / Discard semantics carry through.
  const handleAskUnpin = (employee) => {
    let count = 0;
    Object.entries(pinnedMap).forEach(([cellKey, empSet]) => {
      if (empSet && empSet.has(employee.id)) {
        // Only count cells where the employee is still actually assigned —
        // otherwise the pin is stale and there's nothing to unpin in the
        // user's mental model.
        const stillAssigned = (assignmentMap[cellKey] || []).some(
          (e) => e.id === employee.id,
        );
        if (stillAssigned) count += 1;
      }
    });
    if (count === 0) {
      setSnackbar({
        message: `${employee.firstName} ${employee.lastName} has no pinned assignments.`,
        opened: true,
      });
      return;
    }
    setUnpinTarget({ employee, count });
  };

  // Remove the employee from every cell's pin Set. The pendingChanges
  // memo diffs pinnedMap vs originalPinnedMap and emits one UNPIN
  // pendingChange per affected cell.
  const handleConfirmUnpin = () => {
    if (!unpinTarget) return;
    const { employee, count } = unpinTarget;
    setPinnedMap((prev) => {
      const next = {};
      Object.keys(prev).forEach((cellKey) => {
        const old = prev[cellKey];
        if (old && old.has(employee.id)) {
          const copy = new Set(old);
          copy.delete(employee.id);
          next[cellKey] = copy;
        } else {
          next[cellKey] = old;
        }
      });
      return next;
    });
    setSnackbar({
      message: `Unpinned ${count} assignment${count === 1 ? '' : 's'} for ${employee.firstName} ${employee.lastName}.`,
      opened: true,
    });
    setUnpinTarget(null);
  };

  // Remove the targeted employee from every cell in one setAssignmentMap.
  // The existing change-tracker memo picks this up and emits one UNASSIGNED
  // pendingChange per affected cell, so Save / Discard work unchanged.
  const handleConfirmClearAll = () => {
    if (!clearTarget) return;
    const { employee, count } = clearTarget;
    setAssignmentMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((cellKey) => {
        const filtered = next[cellKey].filter((e) => e.id !== employee.id);
        if (filtered.length !== next[cellKey].length) next[cellKey] = filtered;
      });
      return next;
    });
    // If we were "finding" this employee, drop the highlight too — there's
    // nothing left for it to point at locally until Save is undone.
    if (findHighlightedEmpId === employee.id) setFindHighlightedEmpId(null);
    setSnackbar({
      message: `Cleared ${count} assignment${count === 1 ? '' : 's'} for ${employee.firstName} ${employee.lastName}.`,
      opened: true,
    });
    setClearTarget(null);
  };

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

    const { assignmentMap: newMap, datesByWeekday: newDates, pinnedMap: newPinned } = buildAssignmentMap(
      rotaData.shiftAssignmentList,
      weekdayOrder
    );
    setAssignmentMap(newMap);
    setDatesByWeekday(newDates);
    setPinnedMap(newPinned);

    // CRITICAL FIX: Only update originalAssignmentMap for CURRENT version
    // NOT for historical versions (historical versions should be read-only)
    const isCurrentVersion = currentVersion?.isCurrent !== false;

    if (Object.keys(originalAssignmentMap).length === 0 ||
      (!viewingHistoricalVersion && isCurrentVersion)) {
      setOriginalAssignmentMap(JSON.parse(JSON.stringify(newMap)));
      // Mirror the baseline copy for pinnedMap. JSON can't round-trip a
      // Set, so we rebuild each cell's Set by spreading.
      const pinnedSnapshot = {};
      Object.keys(newPinned || {}).forEach((k) => {
        pinnedSnapshot[k] = new Set(newPinned[k]);
      });
      setOriginalPinnedMap(pinnedSnapshot);
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

    // UNPIN diff: cells where the employee is still assigned (so we
    // didn't already emit UNASSIGNED above) but the pin flag flipped
    // true -> false. The save endpoint flips is_pinned to false on the
    // matching row AND deletes the corresponding pinned_template_assignment
    // entry so the next solve doesn't re-pin them.
    Object.keys(originalPinnedMap).forEach((cellKey) => {
      const wasPinned = originalPinnedMap[cellKey] || new Set();
      const isPinned = pinnedMap[cellKey] || new Set();
      const stillAssigned = new Set((assignmentMap[cellKey] || []).map((e) => e.id));
      wasPinned.forEach((empId) => {
        if (!isPinned.has(empId) && stillAssigned.has(empId)) {
          const shiftId = getShiftIdFromCellKey(cellKey);
          if (shiftId) {
            const employee = (assignmentMap[cellKey] || []).find((e) => e.id === empId);
            changes.push({
              cellKey,
              shiftId,
              oldEmployeeId: empId,
              newEmployeeId: empId,
              changeReason: 'MANUAL_UNPIN',
              changeType: 'UNPIN',
              employee,
            });
            // Don't overwrite a more important highlight (ASSIGNED /
            // UNASSIGNED / REASSIGNED) — UNPIN is a subtler change.
            if (!highlights[cellKey]) highlights[cellKey] = 'UNPIN';
          }
        }
      });
    });

    setPendingChanges(changes);
    setChangeHighlights(highlights);
  }, [assignmentMap, originalAssignmentMap, pinnedMap, originalPinnedMap, viewingHistoricalVersion]);

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

  // Drawer-click handler: parse the row id (location|shiftType) out of the
  // cellKey, find the matching virtualized row, and scroll it into view.
  const handleNavigateToConflict = (cellKey) => {
    const parts = cellKey.split('|');
    if (parts.length !== 5) return;
    const [location, shiftType] = parts;
    const rowKey = `${location}|${shiftType}`;
    const idx = rowData.findIndex((r) => r.key === rowKey);
    if (idx >= 0) {
      rowVirtualizer.scrollToIndex(idx, { align: 'start' });
    }
    setConflictsDrawerOpen(false);
  };

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
    // Read-only users (no edit capability) cannot drag.
    if (!canEditSchedule) return;
    setActiveDragId(active.id);
    const [, empIdStr] = active.id.split("|");
    const empId = Number(empIdStr);
    // findEmpById falls back to the out-of-region list — needed when the
    // user drags a card from the "Other Regions" tab.
    setDraggedEmployee(findEmpById(empId));
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

    if (!canEditSchedule) return;     // read-only: drop is a no-op
    if (!over) return;

    const [, empIdStr] = active.id.split("|");
    const empId = Number(empIdStr);
    const droppedEmp = findEmpById(empId);
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
    // Restore the pin state alongside — pendingChanges diffs against
    // originalPinnedMap, so clearing pinnedMap back to its baseline
    // automatically drops any UNPIN entries that were queued.
    const pinnedRestore = {};
    Object.keys(originalPinnedMap).forEach((k) => {
      pinnedRestore[k] = new Set(originalPinnedMap[k]);
    });
    setPinnedMap(pinnedRestore);
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
    // Reset the pin baseline too so a freshly-saved state doesn't keep
    // showing UNPIN entries as still-pending.
    const pinnedSnapshot = {};
    Object.keys(pinnedMap || {}).forEach((k) => {
      pinnedSnapshot[k] = new Set(pinnedMap[k]);
    });
    setOriginalPinnedMap(pinnedSnapshot);
    setPendingChanges([]);
    setChangeHighlights({});
    clearBackendConflicts();
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

          {conflictCells.size > 0 && (
            <Tooltip title="Click to list every conflict and jump to it">
              <Chip
                icon={<WarningAmberIcon />}
                label={`${conflictCells.size} conflict${conflictCells.size === 1 ? '' : 's'}`}
                color="error"
                clickable
                onClick={() => setConflictsDrawerOpen(true)}
                sx={{ mr: 2 }}
              />
            </Tooltip>
          )}

          {slotFilterInfo && (() => {
            let dateLabel = slotFilterInfo.date;
            try {
              const d = new Date(`${slotFilterInfo.date}T00:00:00`);
              dateLabel = format(d, 'EEE d MMM');
            } catch { /* keep raw */ }
            const label = `Free on ${dateLabel} · ${slotFilterInfo.location} · ${slotFilterInfo.startTime}`;
            return (
              <Chip
                label={label}
                color="primary"
                variant="outlined"
                onDelete={() => setSelectedSlotKey(null)}
                sx={{ mr: 2 }}
              />
            );
          })()}

          {findHighlightedEmpId != null && (() => {
            const emp = findEmpById(findHighlightedEmpId);
            const label = emp ? `Highlighting ${emp.firstName} ${emp.lastName}` : 'Highlighting…';
            return (
              <Chip
                label={label}
                color="warning"
                variant="outlined"
                onDelete={() => setFindHighlightedEmpId(null)}
                sx={{ mr: 2 }}
              />
            );
          })()}

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

          {canEditSchedule && (
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
          )}

          {canEditSchedule && (
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
          )}

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

          {canPublishShifts && (
            <Tooltip title="Publish unallocated shifts">
              <span>
                <IconButton onClick={handlePublish} disabled={publishing || viewingHistoricalVersion}>
                  <CampaignIcon />
                </IconButton>
              </span>
            </Tooltip>
          )}

          <Tooltip title="Version history">
            <IconButton onClick={() => setVersionSidebarOpen(true)}>
              <HistoryIcon />
            </IconButton>
          </Tooltip>

          {canEditSchedule && (
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
          )}
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
                  pinnedMap={pinnedMap}
                  conflictCells={conflictCells}
                  conflictCellInfo={conflictCellInfo}
                  findHighlightedEmpId={findHighlightedEmpId}
                  selectedSlotKey={selectedSlotKey}
                  onSelectSlot={handleSelectSlot}
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

      <FloatingEmployeeList
        employees={summarizedEmpList || []}
        outOfRegionEmployees={outOfRegionEmpList}
        outOfRegionLoading={outOfRegionLoading}
        outOfRegionError={outOfRegionError}
        onRequestOutOfRegion={handleRequestOutOfRegion}
        findHighlightedEmpId={findHighlightedEmpId}
        onToggleFindHighlight={handleToggleFindHighlight}
        onClearAllForEmployee={handleAskClearAll}
        onUnpinForEmployee={handleAskUnpin}
        slotFilterInfo={slotFilterInfo}
        onClearSlotFilter={() => setSelectedSlotKey(null)}
      />

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
        onSaveConflict={handleSaveConflict}
      />

      <ConflictsDrawer
        open={conflictsDrawerOpen}
        onClose={() => setConflictsDrawerOpen(false)}
        conflictCells={conflictCells}
        conflictCellInfo={conflictCellInfo}
        onNavigate={handleNavigateToConflict}
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

      <Dialog
        open={!!clearTarget}
        onClose={() => setClearTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Clear all assignments?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Remove{' '}
            <strong>
              {clearTarget?.employee.firstName} {clearTarget?.employee.lastName}
            </strong>{' '}
            from <strong>{clearTarget?.count}</strong> cell
            {clearTarget?.count === 1 ? '' : 's'}? Changes can be discarded
            before saving.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearTarget(null)}>Cancel</Button>
          <Button onClick={handleConfirmClearAll} variant="contained" color="error">
            Clear All
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!unpinTarget}
        onClose={() => setUnpinTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Unpin all assignments?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Release the pin lock on{' '}
            <strong>{unpinTarget?.count}</strong> currently-pinned
            assignment{unpinTarget?.count === 1 ? '' : 's'} for{' '}
            <strong>
              {unpinTarget?.employee.firstName} {unpinTarget?.employee.lastName}
            </strong>
            ? The allocation stays — the next solve will be free to move
            them. Changes can be discarded before saving.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnpinTarget(null)}>Cancel</Button>
          <Button onClick={handleConfirmUnpin} variant="contained" color="warning">
            Unpin
          </Button>
        </DialogActions>
      </Dialog>
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