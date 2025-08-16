import React, { useState, useCallback, useEffect } from "react";
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Typography, Box, Chip, Tooltip
} from "@mui/material";
import { format, addDays, eachDayOfInterval } from "date-fns";
import { useDroppable, DndContext } from "@dnd-kit/core";
import FloatingEmployeeList from "./FloatingEmployeeList";
import { scheduleData } from "../data/schedule";
import { useRotaWebSocket } from "../components/useRotaWebSocket";
import { da, hi } from "date-fns/locale";

const weekdayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const startDate = new Date("2025-08-04");
const endDate = addDays(startDate, 27);
const allDates = eachDayOfInterval({ start: startDate, end: endDate });

const datesByWeekday = {};
weekdayOrder.forEach((day) => {
  datesByWeekday[day] = allDates.filter((d) => format(d, "EEE") === day);
});

function DroppableCell({ id, assigned, onRemove, highlighted }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  // console.log(" =========================== DroppableCell rendered for id:", id, "isOver:", isOver, "assigned:", assigned, "highlighted:", highlighted); 
  const [, location, shiftType, date] = id.split("|");
  const cellKey = `${location}|${shiftType}|${date}`;

  const assignedIds = assigned.map((e) => e.id);
  const extraHighlighted = highlighted.filter((e) => !assignedIds.includes(e.id));
  const allVisible = [...assigned, ...extraHighlighted];


  return (
    <Tooltip title={id} arrow>
      <Box
        ref={setNodeRef}
        sx={{
          flexGrow: 1,
          border: isOver ? "2px dashed #3f51b5" : "1px dashed #ccc",
          borderRadius: 1,
          backgroundColor: isOver ? "#e3f2fd" : "#fafafa",
          padding: 0.5,
          mt: 0.5,
          display: "flex",
          flexWrap: "wrap",
          gap: 0.5,
          minHeight: 40,
        }}
      >
        {/* Chips or Unassigned */}
        {allVisible.length > 0 ? (
          allVisible.map((emp) => (
            <Chip
              key={`${cellKey}-${emp.id}`}
              label={`${emp.firstName} ${emp.lastName}`}
              onDelete={() => onRemove(cellKey, emp)}
              sx={{
                whiteSpace: "nowrap",
                backgroundColor: highlighted.some((e) => e.id === emp.id)
                  ? "#a5d6a7"
                  : "#e0e0e0",
              }}
            />
          ))
        ) : (
          <em style={{ color: "#888" }}>Unassigned</em>
        )}
      </Box>
    </Tooltip>
  );
}

function buildAssignmentMap(assignments) {
  const map = {};

  assignments.forEach(({ location, shiftType, date, employee }) => {
    const key = `${location}|${shiftType}|${date}`;
    map[key] = employee;
  });

  return map;
}


export default function ExpandedScheduleView() {


  const rotaData = useRotaWebSocket();
  const schedule = rotaData.shiftAssignmentList || [];
  const empList = rotaData.employeeList || [];
  const [assignmentMap, setAssignmentMap] = useState({});
  useEffect(() => {
  if (rotaData?.shiftAssignmentList) {
    const newMap = buildAssignmentMap(rotaData.shiftAssignmentList);
    setAssignmentMap(newMap);
  }
}, [rotaData.shiftAssignmentList]);

  // Group assignments by location + shiftType
  const [groupedAssignments, setGroupedAssignments] = useState({});

//   useEffect(() => {
//   const grouped = {};
//   schedule.forEach((assignment) => {
//     const key = `${assignment.location}|${assignment.shiftType}`;
//     if (!grouped[key]) {
//       grouped[key] = [];
//     }
//     grouped[key].push(assignment);
//   });
//   setGroupedAssignments(grouped);
// }, [schedule]);

useEffect(() => {
  if (rotaData?.shiftAssignmentList) {
    const grouped = {};
    rotaData.shiftAssignmentList.forEach((assignment) => {
      const key = `${assignment.location}|${assignment.shiftType}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(assignment);
    });
    setGroupedAssignments(grouped);
  }
}, [rotaData.shiftAssignmentList]);

  const [highlighted, setHighlighted] = useState({});


  // useEffect(() => {
  //   console.log("🔍 Highlighted updated:", highlighted);
  // }, [highlighted]);

  function handleRemove(cellKey, emp) {
  setAssignmentMap((prev) => {
    const current = prev[cellKey] ?? [];
    return {
      ...prev,
      [cellKey]: current.filter((e) => e.id !== emp.id),
    };
  });

  setHighlighted((prev) => {
    const current = prev[cellKey] ?? [];
    return {
      ...prev,
      [cellKey]: current.filter((e) => e.id !== emp.id),
    };
  });
}

  function handleDrop({ active, over }) {
    const [, empIdStr] = active.id.split("|");
    const empId = Number(empIdStr);
    const droppedEmp = empList.find((e) => e.id === empId);
    if (!droppedEmp || !over) return;

    const [, location, shiftType, date] = over.id.split("|");
    const cellKey = `${location}|${shiftType}|${date}`;

    setAssignmentMap((prev) => {
  const current = prev[cellKey] ?? [];
  const alreadyAssigned = current.some((e) => e.id === droppedEmp.id);
  if (alreadyAssigned) return prev;

  return {
    ...prev,
    [cellKey]: [...current, droppedEmp],
  };
});
    

    setHighlighted((prev) => {
      const current = prev[cellKey] ?? [];
      const alreadyAssigned = current.some((e) => e.id === droppedEmp.id);
      if (alreadyAssigned) return prev;

      return {
        ...prev,
        [cellKey]: [...current, droppedEmp],
      };
    });
  }

if (!rotaData?.shiftAssignmentList?.length) {
    return <Typography>Waiting for schedule to be solved...</Typography>;
  }

  return (
    
    <DndContext onDragEnd={handleDrop}>
      <Typography variant="h6" gutterBottom>
        Schedule View (Grouped by Day)
      </Typography>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Location - Shift</TableCell>
              {weekdayOrder.map((day) => (
                <TableCell key={day} sx={{ fontWeight: "bold" }}>
                  {day}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(groupedAssignments).map(([key, assignments], idx) => {
              const [location, shiftType] = key.split("|");
              //console.log("location shiftType ", location, shiftType);
              return (
                <TableRow key={idx}>
                  <TableCell>{`${location} - ${shiftType}`}</TableCell>
                  {weekdayOrder.map((day) => (
                    <TableCell key={day} sx={{ verticalAlign: "top" }}>
                      {datesByWeekday[day].map((date) => {
                        const dateStr = format(date, "yyyy-MM-dd");
                        const matching = assignments.filter((a) => a.date === dateStr);

                        return matching.map((assignment) => {
                          const cellKey = `${location}|${shiftType}|${assignment.date}`;
                          const droppableId = `cell|${cellKey}`;
                          //const emp = assignment.employee;
                          //const assigned = emp ? [`${emp.firstName} ${emp.lastName}`] : [];
                          // const cellKey = `${location}|${shiftType}|${date}`;
                          const assigned = assignmentMap[cellKey] || [];

                          return (
                            <Table
                              key={assignment.id}
                              size="small"
                              sx={{ borderCollapse: "separate", mb: 1, width: "100%" }}
                            >
                              <TableBody>
                                <TableRow sx={{ height: 24 }}>
                                  <TableCell
                                    sx={{
                                      p: 0,
                                      fontWeight: "bold",
                                      verticalAlign: "middle",
                                      height: 24,
                                      lineHeight: "24px",
                                      borderBottom: "none",
                                    }}
                                  >
                                    {format(new Date(assignment.date), "MMM d")}
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell sx={{ p: 0, borderTop: "none" }}>


                                    <DroppableCell
                                      id={droppableId}
                                      assigned={assignmentMap[cellKey] ?? []}
                                      highlighted={highlighted[cellKey] ?? []}
                                      onRemove={handleRemove}
                                    />

                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          );
                        });
                      })}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <FloatingEmployeeList employees={rotaData.employeeList || []} />
    </DndContext>
  );
}
