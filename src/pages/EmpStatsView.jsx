import React, { useEffect, useState } from "react";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  TableContainer,
  Paper,
  CircularProgress,
  Box,
  Alert,TextField,
} from "@mui/material";
import { API_ENDPOINTS } from "../api/endpoint";
import axiosInstance from "../components/axiosInstance";
import { shiftTypes } from "../components/shiftTypeGrading";

const stickyHeaderStyle = {
  position: "sticky",
  top: 0,
  backgroundColor: "#1976d2",
  color: "#ffffff",
  zIndex: 2,
  fontWeight: "bold",
  textAlign: "center",
  borderBottom: "2px solid #1565c0",
  padding: "4px",
};

const stickyHeaderStyleSecondRow = {
  position: "sticky",
  top: 40,
  backgroundColor: "#1976d2",
  color: "#ffffff",
  zIndex: 2,
  fontWeight: "bold",
  textAlign: "center",
  borderBottom: "2px solid #1565c0",
  padding: "6px 4px",
};

// Color scheme for shift types
const shiftTypeColors = {
  DAY: {
    light: "#E3F2FD",
    dark: "#BBDEFB"
  },
  LONG_DAY: {
    light: "#FFF3E0",
    dark: "#FFE0B2"
  },
  WAKING_NIGHT: {
    light: "#F3E5F5",
    dark: "#E1BEE7"
  },
  FLOATING: {
    light: "#E8F5E9",
    dark: "#C8E6C9"
  }
};

export default function EmpStatsTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nameFilter, setNameFilter] = useState('');


  useEffect(() => {
    const rotaId = new URLSearchParams(window.location.search).get("id");
    axiosInstance
      .get(`${API_ENDPOINTS.empStats}?id=${rotaId}`)
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load service stats");
      })
      .finally(() => setLoading(false));
  }, []);

  const weekNumbers = [1, 2, 3, 4];

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="info">No employee statistics available</Alert>
      </Box>
    );
  }

  const weekDateRanges = {};
  const employeeWithData = data.find(emp => emp.weeklyStats && emp.weeklyStats.length > 0);
  
  if (employeeWithData && employeeWithData.weeklyStats) {
    employeeWithData.weeklyStats.forEach((week) => {
      weekDateRanges[week.weekNumber] = {
        start: week.weekStart,
        end: week.weekEnd,
      };
    });
  }
const filteredData = data.filter((emp) =>
    (emp.name || "").toLowerCase().includes(nameFilter.toLowerCase())
  );
  return (
    <Box sx={{ mt: '64px' }}>
      <TableContainer
        component={Paper}
        sx={{
          mt: 2,
          height: "calc(100vh - 150px)",
          overflowY: "auto",
          border: "1px solid #ccc",
          borderRadius: 2,
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ height: '40px' }}>
              <TableCell sx={{ ...stickyHeaderStyle, height: '40px' }} rowSpan={2}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: "bold", color: "#fff" }}>
                    Name
                  </Typography>
                  <TextField
                    placeholder="Filter"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    variant="standard"
                    fullWidth
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        fontSize: "0.75rem",
                        color: "#fff",
                        backgroundColor: "rgba(255, 255, 255, 0.15)",
                        borderRadius: 1,
                        px: 1,
                        height: 24,
                      },
                    }}
                    inputProps={{ style: { padding: 0 } }}
                  />
                </Box>
              </TableCell>
              <TableCell sx={{ ...stickyHeaderStyle, height: '40px' }} rowSpan={2}>Contract</TableCell>
              <TableCell sx={{ ...stickyHeaderStyle, height: '40px' }} rowSpan={2}>Type</TableCell>
              {weekNumbers.map((week) => {
                const dateRange = weekDateRanges[week];
                return (
                  <TableCell
                    key={`week-${week}`}
                    align="center"
                    colSpan={2}
                    sx={{ 
                      ...stickyHeaderStyle, 
                      backgroundColor: "#1565c0",
                      padding: "2px 4px",
                      minWidth: "160px",
                      whiteSpace: "nowrap",
                      height: '40px'
                    }}
                  >
                    <Box sx={{ lineHeight: 1, margin: 0 }}>
                      <Box component="span" sx={{ fontWeight: 'bold', fontSize: '13px', display: 'block' }}>
                        Week {week}
                      </Box>
                      {dateRange && (
                        <Box component="span" sx={{ fontSize: '9px', fontWeight: 'normal', display: 'block' }}>
                          {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                );
              })}
              <TableCell align="center" colSpan={2} sx={{ ...stickyHeaderStyle, backgroundColor: "#1565c0", height: '40px' }}>
                Total
              </TableCell>
            </TableRow>

            <TableRow sx={{ height: '32px' }}>
              {weekNumbers.map((week) => (
                <React.Fragment key={`sub-${week}`}>
                  <TableCell align="center" sx={{ ...stickyHeaderStyleSecondRow, height: '32px' }}>Hours</TableCell>
                  <TableCell align="center" sx={{ ...stickyHeaderStyleSecondRow, height: '32px' }}>Count</TableCell>
                </React.Fragment>
              ))}
              <TableCell align="center" sx={{ ...stickyHeaderStyleSecondRow, height: '32px' }}>Hours</TableCell>
              <TableCell align="center" sx={{ ...stickyHeaderStyleSecondRow, height: '32px' }}>Count</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredData.map((emp, empIndex) => {
              const weekMap = new Map(emp.weeklyStats.map(w => [w.weekNumber, w]));
              const isEvenEmployee = empIndex % 2 === 0;
              
              const weeklyTotals = weekNumbers.map((weekNum) => {
                let weekHours = 0;
                let weekCount = 0;
                
                shiftTypes.forEach((type) => {
                  const summary = weekMap.get(weekNum)?.shiftSummary?.[type];
                  weekHours += parseFloat(summary?.hours ?? "0");
                  weekCount += summary?.count ?? 0;
                });
                
                return { hours: weekHours, count: weekCount };
              });

              const grandTotal = weeklyTotals.reduce(
                (acc, week) => ({
                  hours: acc.hours + week.hours,
                  count: acc.count + week.count,
                }),
                { hours: 0, count: 0 }
              );

              return (
                <React.Fragment key={emp.name}>
                  {shiftTypes.map((type, j) => {
                    let totalHours = 0;
                    let totalCount = 0;
                    const bgColor = isEvenEmployee ? shiftTypeColors[type]?.light : shiftTypeColors[type]?.dark;

                    return (
                      <TableRow 
                        key={`${emp.name}-${type}`}
                        sx={{ 
                          backgroundColor: bgColor,
                          '&:hover': { 
                            filter: 'brightness(0.95)',
                            cursor: 'pointer'
                          },
                          transition: 'all 0.2s'
                        }}
                      >
                        {j === 0 && (
                          <>
                            <TableCell rowSpan={shiftTypes.length + 1} sx={{ borderRight: '1px solid #ddd' }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {emp.name}
                              </Typography>
                            </TableCell>
                            <TableCell rowSpan={shiftTypes.length + 1} sx={{ borderRight: '1px solid #ddd' }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {emp.contractType ?? "—"}
                              </Typography>
                            </TableCell>
                          </>
                        )}

                        <TableCell sx={{ fontWeight: 600, borderRight: '1px solid #ddd' }}>{type}</TableCell>

                        {weekNumbers.map((weekNum) => {
                          const summary = weekMap.get(weekNum)?.shiftSummary?.[type];
                          const hours = parseFloat(summary?.hours ?? "0");
                          const count = summary?.count ?? 0;

                          totalHours += hours;
                          totalCount += count;

                          return (
                            <React.Fragment key={`data-${weekNum}-${type}`}>
                              <TableCell align="center" sx={{ borderRight: '1px solid #e0e0e0' }}>
                                {hours.toFixed(1)}
                              </TableCell>
                              <TableCell align="center" sx={{ borderRight: '1px solid #ddd' }}>
                                {count}
                              </TableCell>
                            </React.Fragment>
                          );
                        })}

                        <TableCell align="center" sx={{ fontWeight: 600, borderRight: '1px solid #e0e0e0' }}>
                          {totalHours.toFixed(1)}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600 }}>
                          {totalCount}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  
                  <TableRow 
                    sx={{ 
                      backgroundColor: "#37474F",
                      color: "#ffffff",
                      '&:hover': { 
                        backgroundColor: "#455A64"
                      }
                    }}
                  >
                    <TableCell sx={{ fontWeight: "bold", color: "#ffffff", borderRight: '1px solid #546e7a' }}>
                      Weekly Total
                    </TableCell>
                    
                    {weeklyTotals.map((weekTotal, idx) => (
                      <React.Fragment key={`total-week-${idx}`}>
                        <TableCell align="center" sx={{ fontWeight: "bold", color: "#ffffff", borderRight: '1px solid #546e7a' }}>
                          {weekTotal.hours.toFixed(1)}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: "bold", color: "#ffffff", borderRight: '1px solid #546e7a' }}>
                          {weekTotal.count}
                        </TableCell>
                      </React.Fragment>
                    ))}
                    
                    <TableCell align="center" sx={{ fontWeight: "bold", color: "#ffffff", borderRight: '1px solid #546e7a' }}>
                      {grandTotal.hours.toFixed(1)}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold", color: "#ffffff" }}>
                      {grandTotal.count}
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}