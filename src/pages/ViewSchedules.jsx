import { useState, useEffect } from "react";
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Typography, Box, Tooltip, Button, CircularProgress
} from "@mui/material";
import { format, addDays, eachDayOfInterval } from "date-fns";
import { DndContext } from "@dnd-kit/core";
import FloatingEmployeeList from "./FloatingEmployeeList";
import { useSearchParams } from 'react-router-dom';
// import { scheduleData } from "../data/schedule"
import { API_ENDPOINTS } from '../api/endpoint';
import axiosInstance from '../components/axiosInstance';
import { DroppableCell } from "../components/droppableCell";
import { useNavigate } from 'react-router-dom';


const weekdayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const datesByWeekday = {};
weekdayOrder.forEach((day) => {
  datesByWeekday[day] = [];
});
function LoadingSpinner() {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      verticalAlign="middle"
      height="100%"
      width="100%"
    >
      <CircularProgress size={48} thickness={4} />
    </Box>
  );
}

function buildAssignmentMap(assignments) {
  const map = {};
  const seen = {}; // Track employee IDs per key

  assignments.forEach(({ shift, employee }) => {
    const location = shift.shiftTemplate.location;
    const shiftType = shift.shiftTemplate.shiftType;
    const date = shift.shiftStart; // "YYYY-MM-DD"
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
    const weekday = format(new Date(dateStr), "EEE"); // e.g. "Sun"
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
    console.log("Processing assignment:", { shift, employee });
    if (!shiftTypeMap[employee.id]) {
      shiftTypeMap[employee.id] = {};
    }
    shiftTypeMap[employee.id][shift.shiftTemplate.shiftType] =
      (shiftTypeMap[employee.id][shift.shiftTemplate.shiftType] || 0) + 1;
  });

  // Step 2: Update emplist with shiftTypeSummary
  const updatedEmplist = emplist.map(emp => ({
    ...emp,
    shiftTypeSummary: shiftTypeMap[emp.id] || {}

  }));

  console.log("Updated Employee List with Shift Summary:", updatedEmplist);
  return updatedEmplist;
}

export default function ExpandedScheduleView() {
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ message: '', opened: false });
  const [rotaData, setRotaData] = useState(null);


  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');

  var empList = rotaData?.employeeList || [];
  const [assignmentMap, setAssignmentMap] = useState({});
  const [groupedAssignments, setGroupedAssignments] = useState({});
  const [summarizedEmpList, setSummarizedEmpList] = useState([]);
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
  }, []);

  useEffect(() => {
    if (rotaData?.shiftAssignmentList) {
      const newMap = buildAssignmentMap(rotaData.shiftAssignmentList);
      setAssignmentMap(newMap);
      const grouped = {};
      rotaData.shiftAssignmentList.forEach((assignment) => {
        const { location, shiftType } = assignment.shift.shiftTemplate;
        const key = `${location}|${shiftType}`;

        if (!grouped[key]) {
          grouped[key] = [];
        }

        grouped[key].push(assignment);
      });
      setGroupedAssignments(grouped);
      const updated = setEmpSummary(rotaData.employeeList, rotaData.shiftAssignmentList);
      setSummarizedEmpList(updated);
    }
  }, [rotaData?.shiftAssignmentList]);




  const [highlighted, setHighlighted] = useState({});

  function handleRemove(cellKey, emp) {

    setAssignmentMap((prev) => {
      const current = prev[cellKey] ?? [];
      const [location, shiftType, date, shiftTime] = cellKey.split("|");
      console.log(emp);

      if (emp.shiftTypeSummary && emp.shiftTypeSummary[shiftType]) {
        emp.shiftTypeSummary[shiftType] = (emp.shiftTypeSummary[shiftType] ?? 0) - 1;
      } else {
        const removedEmp = summarizedEmpList.find((e) => e.id === emp.id);
        emp.shiftTypeSummary = removedEmp?.shiftTypeSummary || {};
        emp.shiftTypeSummary[shiftType] = (emp.shiftTypeSummary[shiftType] ?? 0) - 1;
      }

      const updated = current.filter((e) => e.id !== emp.id);
      return { ...prev, [cellKey]: updated };
    });

    setHighlighted((prev) => {
      const current = prev[cellKey] ?? [];
      const updated = current.filter((e) => e.id !== emp.id);
      return { ...prev, [cellKey]: updated };
    });
  }

  function handleDrop({ active, over }) {
    const [, empIdStr] = active.id.split("|");
    const empId = Number(empIdStr);
    const droppedEmp = summarizedEmpList.find((e) => e.id === empId);
    if (!droppedEmp || !over) return;

    const [, location, shiftType, date, shiftTime] = over.id.split("|");
    const cellKey = `${location}|${shiftType}|${date}|${shiftTime}`;

    setAssignmentMap((prev) => {
      const current = prev[cellKey] ?? [];
      const alreadyAssigned = current.some((e) => e.id === droppedEmp.id);
      if (alreadyAssigned) return prev;
      droppedEmp.shiftTypeSummary[shiftType] = (droppedEmp.shiftTypeSummary[shiftType] ?? 0) + 1;
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
        method: 'POST',
        body: JSON.stringify({ assignments: compactMap, rota: id }),
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          'Content-Type': 'application/json',
        },
      });



      setSnackbar({ message: response.message || 'Saved successfully!', opened: true });
      navigate("/submit");
    } catch (error) {
      setSnackbar({ message: 'Save failed. Please try again.', opened: true });
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }

  }
  function hasUnsavedChanges() {

  }
  if (!rotaData?.shiftAssignmentList?.length) {
    return <Typography>Waiting for schedule to be solved...</Typography>;
  }

  if (loading) {
    return <LoadingSpinner />
  }
  return (

    <DndContext onDragEnd={handleDrop}>
      <Typography variant="h6" gutterBottom>
        Schedule View (Grouped by Day)
      </Typography>

      <Box
        sx={{
          paddingTop: 5,
          maxHeight: 'calc(100vh - 90px)', // adjust based on footer height
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <TableContainer component={Paper} sx={{

          verticalAlign: "top",
          position: 'sticky',
          left: 0,
          backgroundColor: 'white',
          zIndex: 2,
          fontWeight: 'bold',
        }} >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>Location - Shift</TableCell>
                {weekdayOrder.map((day) => (
                  <TableCell key={day} sx={{ fontWeight: "bold", textAlign: "center" }}>
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
                  <TableRow key={idx} sx={{ position: 'sticky', verticalAlign: "top" }}>
                    <TableCell sx={{
                      position: 'sticky',
                      left: 0,
                      backgroundColor: 'white',
                      zIndex: 2,
                      fontWeight: 'bold',
                    }}>
                      {`${location} - ${shiftType.replaceAll("_", " ") }`}
                    </TableCell>
                    {weekdayOrder.map((day) => (
                      <TableCell key={day} sx={{ verticalAlign: "top" }}>
                        {datesByWeekday[day].map((date) => {
                          const dateStr = date; //format(date, "yyyy-MM-dd");
                          //const matching = assignments.filter((a) => a.date === dateStr);
                          const matching = assignments.filter((a) => {
                            const shiftDateStr = format(new Date(a.shift.shiftStart), "yyyy-MM-dd");
                            return shiftDateStr === dateStr;
                          });


                          return matching.map((assignment) => {
                            //const cellKey = `${location}|${shiftType}|${assignment.date}`;
                            const shiftDateStr = format(new Date(assignment.shift.shiftStart), "yyyy-MM-dd");
                            const shiftStartTime = assignment.shift.shiftTemplate.startTime;
                            const cellKey = `${location}|${shiftType}|${shiftDateStr}|${shiftStartTime}`;
                            const droppableId = `cell|${cellKey}`;
                            //const assigned = assignmentMap[cellKey] || [];

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
                                        verticalAlign: "top",
                                        height: 24,
                                        lineHeight: "24px",
                                        borderBottom: "none",
                                      }}
                                    >
                                      {format(new Date(assignment.shift.shiftStart), "MMM d")}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell
                                      sx={{
                                        p: 0,
                                        borderTop: "none",
                                        width: "40%",
                                        fontSize: "0.85rem",
                                      }}
                                    >
                                      {assignment.shift.shiftTemplate.startTime}
                                    </TableCell>
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
      </Box>
      <FloatingEmployeeList employees={summarizedEmpList || []} />
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          height: 50,
          width: "100%",
          backgroundColor: "#f8f9fa",
          borderTop: "1px solid #dee2e6",
          padding: "12px 24px",
          //paddingRight: 'calc(24px + 16px)',
          textAlign: "right",
          zIndex: 1000,
        }}
      >

        <Button variant="contained" color="primary" onClick={handleSave} disabled={!hasUnsavedChanges}>
          Save Schedule
        </Button>
      </Box>
    </DndContext>
  );
}
