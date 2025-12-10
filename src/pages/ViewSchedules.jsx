import { useState, useEffect, useRef, useMemo, memo } from "react";
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Typography, Box, Tooltip, Button, CircularProgress
} from "@mui/material";
import { format } from "date-fns";
import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { useVirtualizer } from '@tanstack/react-virtual';
import FloatingEmployeeList from "./FloatingEmployeeList";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../api/endpoint';
import axiosInstance from '../components/axiosInstance';
import { DroppableCell } from "../components/droppableCell";

const weekdayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const datesByWeekday = {};
weekdayOrder.forEach((day) => {
  datesByWeekday[day] = [];
});

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
    const key = `${location}|${shiftType}|${date}|${shiftStartTime}`;

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

  uniqueDateStrings.forEach((dateStr) => {
    const weekday = format(new Date(dateStr), "EEE");
    if (datesByWeekday[weekday]) {
      if (!datesByWeekday[weekday].includes(dateStr)) {
        datesByWeekday[weekday].push(dateStr);
      }
    }
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

// Memoized virtual row component
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
  measureElement 
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

            return matching.map((assignment) => {
              const shiftDateStr = format(new Date(assignment.shift.shiftStart), "yyyy-MM-dd");
              const shiftStartTime = assignment.shift.shiftTemplate.startTime;
              const cellKey = `${location}|${shiftType}|${shiftDateStr}|${shiftStartTime}`;
              const droppableId = `cell|${cellKey}`;

              return (
                <Box key={assignment.id} sx={{ mb: 1 }}>
                  <Typography variant="caption" fontWeight="bold" display="block">
                    {format(new Date(assignment.shift.shiftStart), "MMM d")}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    {assignment.shift.shiftTemplate.startTime.slice(0, 5)}-
                    {assignment.shift.shiftTemplate.endTime.slice(0, 5)}
                  </Typography>
                  <DroppableCell
                    id={droppableId}
                    assigned={assignmentMap[cellKey] ?? []}
                    highlighted={highlighted[cellKey] ?? []}
                    onRemove={handleRemove}
                    isDragging={!!activeDragId}
                  />
                </Box>
              );
            });
          })}
        </Box>
      ))}
    </Box>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.activeDragId === nextProps.activeDragId &&
    prevProps.row.key === nextProps.row.key &&
    prevProps.virtualRow.start === nextProps.virtualRow.start &&
    prevProps.assignmentMap === nextProps.assignmentMap
  );
});

VirtualRow.displayName = 'VirtualRow';

export default function ViewSchedules() {
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ message: '', opened: false });
  const [rotaData, setRotaData] = useState(null);
  const [assignmentMap, setAssignmentMap] = useState({});
  const [groupedAssignments, setGroupedAssignments] = useState({});
  const [summarizedEmpList, setSummarizedEmpList] = useState([]);
  const [highlighted, setHighlighted] = useState({});
  const [activeDragId, setActiveDragId] = useState(null);
  const [draggedEmployee, setDraggedEmployee] = useState(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');

  const parentRef = useRef(null);

   const handleBack = () => navigate('/paycycleSchedule');

  useEffect(() => {
    if (!id) return;
    const fetchSchedule = async () => {
      try {
        const response = await axiosInstance.get(`${API_ENDPOINTS.solvedSchedule}?id=${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        setRotaData(response.data);
      } catch (err) {
        console.error('Failed to load schedule', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [id]);

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

    const updated = setEmpSummary(rotaData.employeeList, rotaData.shiftAssignmentList);
    setSummarizedEmpList(updated);
  }, [rotaData]);

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
    overscan: 3, // CRITICAL: Reduced from 50 to 3
  });

  const handleRemove = useMemo(() => (cellKey, emp) => {
    const [, location, shiftType, date, shiftTime] = cellKey.split("|");

    setAssignmentMap((prev) => {
      const current = prev[cellKey] ?? [];
      const updated = current.filter((e) => e.id !== emp.id);
      return { ...prev, [cellKey]: updated };
    });

    setSummarizedEmpList((prevList) => {
      return prevList.map((e) => {
        if (e.id === emp.id) {
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

    setHighlighted((prev) => {
      const current = prev[cellKey] ?? [];
      const updated = current.filter((e) => e.id !== emp.id);
      return { ...prev, [cellKey]: updated };
    });
  }, [rotaData]);

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

    const [, location, shiftType, date, shiftTime] = over.id.split("|");
    const cellKey = `${location}|${shiftType}|${date}|${shiftTime}`;

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

  async function handleSave() {
    setLoading(true);
    const compactMap = Object.fromEntries(
      Object.entries(assignmentMap).map(([slotKey, employees]) => [
        slotKey,
        employees.map(emp => ({ id: emp.id })),
      ])
    );

    try {
      const response = await axiosInstance.post(`${API_ENDPOINTS.updateSolvedSol}`, {
        assignments: compactMap,
        rota: id
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          'Content-Type': 'application/json',
        },
      });

      setSnackbar({ message: response.data.message || 'Saved successfully!', opened: true });
      navigate("/paycycleSchedule");
    } catch (error) {
      setSnackbar({ message: 'Save failed. Please try again.', opened: true });
      console.error('Save error:', error);
    } finally {
      setLoading(false);
      setTimeout(() => handleBack(), 1500);
    }
  }

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
      <Typography variant="h6" gutterBottom>
        Schedule View (Grouped by Day)
      </Typography>

      <Box sx={{
        paddingTop: 5,
        maxHeight: 'calc(100vh - 90px)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <TableContainer
          component={Paper}
          ref={parentRef}
          sx={{
            overflow: 'auto',
            maxHeight: 'calc(100vh - 200px)',
            position: 'relative',
          }}
        >
          {/* Sticky Header */}
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

          {/* Virtualized Rows */}
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

      <Box sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        height: 50,
        width: "100%",
        backgroundColor: "#f8f9fa",
        borderTop: "1px solid #dee2e6",
        padding: "12px 24px",
        textAlign: "right",
        zIndex: 1000,
      }}>
        <Button variant="contained" color="primary" onClick={handleSave}>
          Save Schedule
        </Button>
      </Box>
    </DndContext>
  );
}