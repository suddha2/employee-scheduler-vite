import React, { useState, useRef } from "react";
import {
  Paper,
  Typography,
  IconButton,
  Box,
  Collapse,
  Divider,
  TextField,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { useDraggable, DragOverlay } from "@dnd-kit/core";

function EmployeeItem({ employee }) {
  //const id = `${employee.firstName} ${employee.lastName}`;
  const id = `emp|${employee.id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
  });

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{
        px: 1,
        py: 0.5,
        mb: 1,
        borderRadius: 1,
        fontSize: 14,
        backgroundColor: isDragging ? "primary.light" : "grey.100",
        cursor: "grab",
        userSelect: "none",
        transition: "background-color 0.2s",
        "&:hover": {
          backgroundColor: "grey.200",
        },
      }}
    >
      {employee.firstName} {employee.lastName}
    </Box>
  );
}

export default function FloatingEmployeeList({ employees = [] })  {
  const [open, setOpen] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [position, setPosition] = useState({ top: 100, left: 30 });
  const [searchQuery, setSearchQuery] = useState("");
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    dragging.current = true;
    offset.current = {
      x: e.clientX - position.left,
      y: e.clientY - position.top,
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!dragging.current) return;
    setPosition({
      left: e.clientX - offset.current.x,
      top: e.clientY - offset.current.y,
    });
  };

  const handleMouseUp = () => {
    dragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // Filter employees by search query
  const filteredEmployees = employees.filter((emp) =>
    emp.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Paper
      elevation={10}
      sx={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: 260,
        zIndex: 2000,
        borderRadius: 2,
        border: "1px solid #ccc",
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {/* Header bar */}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 2,
          py: 1,
          backgroundColor: "primary.main",
          color: "white",
          cursor: "move",
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
          Employees
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
          sx={{ color: "white" }}
        >
          {open ? <ExpandMore /> : <ExpandLess />}
        </IconButton>
      </Box>

      <Collapse in={open}>
        <Divider />
        <Box sx={{ p: 2, pt: 1 }}>
          <TextField
            size="small"
            placeholder="Search employees..."
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ maxHeight: 350, overflowY: "auto" }}>
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp) => (
                <EmployeeItem key={emp.id} employee={emp}/>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No employees found.
              </Typography>
            )}
          </Box>
        </Box>
      </Collapse>

      <DragOverlay>
        {activeId ? (
          <Box
            sx={{
              p: 1,
              borderRadius: 1,
              backgroundColor: "primary.light",
              cursor: "grabbing",
            }}
          >
            {activeId}
          </Box>
        ) : null}
      </DragOverlay>
    </Paper>
  );
}
