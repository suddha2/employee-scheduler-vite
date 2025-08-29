import React, { useState, useCallback, useEffect } from "react";
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Typography, Box, Chip, Tooltip,Button
} from "@mui/material";
import { format, addDays, eachDayOfInterval } from "date-fns";
import { useDroppable, DndContext } from "@dnd-kit/core";
import FloatingEmployeeList from "./FloatingEmployeeList";
import { useSearchParams,useLocation } from 'react-router-dom';
// import { scheduleData } from "../data/schedule"
import { API_ENDPOINTS } from '../api/endpoint';

const weekdayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const datesByWeekday = {};
weekdayOrder.forEach((day) => {
  datesByWeekday[day] = [];
});



// function DroppableCell({ id, assigned, onRemove, highlighted }) {
//   const { isOver, setNodeRef } = useDroppable({ id });
//   //console.log(" =========================== DroppableCell rendered for id:", id, "isOver:", isOver, "assigned:", assigned, "highlighted:", highlighted); 
//   const [, location, shiftType, date,shiftTime] = id.split("|");
//   const cellKey = `${location}|${shiftType}|${date}|${shiftTime}`;

//   const assignedIds = assigned.map((e) => e.id);
//   const extraHighlighted = highlighted.filter((e) => !assignedIds.includes(e.id));
//   const allVisible = [...assigned, ...extraHighlighted];


//   return (
//     <Tooltip title={id} arrow>
//       <Box
//         ref={setNodeRef}
//         sx={{
//           flexGrow: 1,
//           border: isOver ? "2px dashed #3f51b5" : "1px dashed #ccc",
//           borderRadius: 1,
//           backgroundColor: isOver ? "#e3f2fd" : "#fafafa",
//           padding: 0.5,
//           mt: 0.5,
//           display: "flex",
//           flexWrap: "wrap",
//           gap: 0.5,
//           minHeight: 40,
//         }}
//       >
//         {/* Chips or Unassigned */}
//         {allVisible.length > 0 ? (
//           allVisible.map((emp) => (
//             <Chip
//               key={`${cellKey}-${emp.id}`}
//               label={`${emp.firstName} ${emp.lastName}`}
//               onDelete={() => onRemove(cellKey, emp)}
//               sx={{
//                 whiteSpace: "nowrap",
//                 backgroundColor: highlighted.some((e) => e.id === emp.id)
//                   ? "#a5d6a7"
//                   : "#e0e0e0",
//               }}
//             />
//           ))
//         ) : (
//           <em style={{ color: "#888" }}>Unassigned</em>
//         )}
//       </Box>
//     </Tooltip>
//   );
// }

function buildAssignmentMap(assignments) {
  console.log("buildAssignmentMap=====================");
  const map = {};

  assignments.forEach(({ shift, employee }) => {
    const location = shift.shiftTemplate.location;
    const shiftType = shift.shiftTemplate.shiftType;
    const date = shift.shiftStart; // "YYYY-MM-DD"
    const shiftStartTime = shift.shiftTemplate.startTime;
    const key = `${location}|${shiftType}|${date}|${shiftStartTime}`;

    if (!map[key]) {
      map[key] = [];
    }

    if (employee) {
      map[key].push(employee);
    }
  });
  
  const uniqueDateStrings = Array.from(
    new Set(assignments.map((a) => a.shift.shiftStart))
  );
  console.log(uniqueDateStrings);
  uniqueDateStrings.forEach((dateStr) => {
    //const date = parseISO(dateStr);
    const weekday = format(new Date(dateStr), "EEE"); // e.g. "Sun"
    
    if (datesByWeekday[weekday]) {
      datesByWeekday[weekday].push(dateStr);
    }
  });
  return map;
}


export default function ExpandedScheduleView_OLD() {
  const location = useLocation();
  console.log("Component mounted");
console.log("location.search:", location.search);
console.log("location.key:", location.key);
const [loading, setLoading] = useState(true);
const [snackbar, setSnackbar] = useState({ message: '', opened: false });
const [rotaData,setRotaData] = useState(null);
  // const{id}= useParams();
  // console.log("id == ",id);

  
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  console.log("id == ",id);
  // const location = useLocation();
  // const rotaData = location.state?.rotaData;
  // console.log("Received RotaData : ",rotaData);

console.log("Component mounted");
console.log("Extracted ID:", id);

useEffect(() => {
  console.log("useEffect triggered");
  
}, [id]);


//   const fetchSchedule = async () => {
//     console.log("Fetching schedule for ID:", id);
//     try {
//       const response = await axiosInstance.get(`${API_ENDPOINTS.solvedSchedule}/${id}`, {
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem('token')}`,
//         },
//       });
//       setRotaData(response.data);
//     } catch (err) {
//       console.error("Failed to load schedule", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   fetchSchedule();
// }, [location]);
  //const rotaData = scheduleData;
  const schedule = rotaData.shiftAssignmentList || [];
  const empList = rotaData.employeeList || [];
  
  
  const [assignmentMap, setAssignmentMap] = useState({});
  const [groupedAssignments, setGroupedAssignments] = useState({});
  
  
  
  useEffect(() => {
    if (rotaData?.shiftAssignmentList) {
      const newMap = buildAssignmentMap(rotaData.shiftAssignmentList);
      setAssignmentMap(newMap);
      console.log(assignmentMap)
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
    }
  }, [rotaData.shiftAssignmentList]);

  const [highlighted, setHighlighted] = useState({});

  function handleRemove(cellKey, emp) {
  console.log("Removing", emp.id, "from", cellKey);

  setAssignmentMap((prev) => {
    const current = prev[cellKey] ?? [];
    const updated = current.filter((e) => e.id !== emp.id);
    console.log("AssignmentMap updated:", updated);
    return { ...prev, [cellKey]: updated };
  });

  setHighlighted((prev) => {
    const current = prev[cellKey] ?? [];
    const updated = current.filter((e) => e.id !== emp.id);
    console.log("Highlighted updated:", updated);
    return { ...prev, [cellKey]: updated };
  });
}

  function handleDrop({ active, over }) {
    const [, empIdStr] = active.id.split("|");
    const empId = Number(empIdStr);
    const droppedEmp = empList.find((e) => e.id === empId);
    if (!droppedEmp || !over) return;

    const [, location, shiftType, date,shiftTime] = over.id.split("|");
    const cellKey = `${location}|${shiftType}|${date}|${shiftTime}`;

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

  async function handleSave(){
    setLoading(true);

  try {
    const response = await fetch('/api/save', {
      method: 'POST',
      body: JSON.stringify({ assignments: assignmentMap }),
      headers: {
          Authorization : `Bearer ${localStorage.getItem("token")}`,
          'Content-Type': 'application/json',
        },
    });

    const result = await response.json();

    setSnackbar({ message: result.message || 'Saved successfully!', opened: true });
  } catch (error) {
    setSnackbar({ message: 'Save failed. Please try again.', opened: true });
    console.error('Save error:', error);
  } finally {
    setLoading(false);
  }

  }
  function hasUnsavedChanges(){

  }
  if (!rotaData?.shiftAssignmentList?.length) {
    return <Typography>Waiting for schedule to be solved...</Typography>;
  }

  return (

    <DndContext onDragEnd={handleDrop}>
      <Typography variant="h6" gutterBottom>
        Schedule View (Grouped by Day)
      </Typography>
      
<Box
  sx={{
    maxHeight: 'calc(100vh - 80px)', // adjust based on footer height
    overflowY: 'auto',
    paddingBottom: '96px', // reserve space so content doesn't hide behind footer
  }}
>
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
      <FloatingEmployeeList employees={rotaData.employeeList || []} />
      <Box
  sx={{
    position: "fixed",
    bottom: 0,
    left: 0,
    width: "100%",
    backgroundColor: "#f8f9fa",
    borderTop: "1px solid #dee2e6",
    padding: "12px 24px",
    textAlign: "right",
    zIndex: 1000,
  }}
>

  <Button variant="contained" color="primary" onClick={handleSave}  disabled={!hasUnsavedChanges}>
    Save Schedule
  </Button>
</Box>
    </DndContext>
  );
}
