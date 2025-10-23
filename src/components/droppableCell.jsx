import { memo } from "react";
import { Box, Chip, Tooltip } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import { shiftColors, shiftTypes, getPriorityColor } from "../components/shiftTypeGrading";

// Memoize to prevent re-renders when parent updates
export const DroppableCell = memo(({ 
  id, 
  assigned, 
  onRemove, 
  highlighted,
  isDragging 
}) => {
  // Only enable droppable when actively dragging - CRITICAL for performance
  const { isOver, setNodeRef } = useDroppable({ 
    id,
    disabled: !isDragging // Disabled when not dragging = no collision detection overhead
  });
  
  const [, location, shiftType, date, shiftTime] = id.split("|");
  const cellKey = `${location}|${shiftType}|${date}|${shiftTime}`;

  const assignedIds = assigned.map((e) => e.id);
  const extraHighlighted = highlighted.filter((e) => !assignedIds.includes(e.id));
  const allVisible = [...assigned, ...extraHighlighted];

  const getUrgencyStyle = (shiftType) => {
    switch (shiftType) {
      case "WAKING_NIGHT":
        return { color: getPriorityColor(shiftColors[shiftType]), fontWeight: 600 };
      case "LONG_DAY":
        return { color: getPriorityColor(shiftColors[shiftType]), fontWeight: 500 };
      case "FLOATING":
        return { color: getPriorityColor(shiftColors[shiftType]), fontStyle: "italic" };
      default:
        return { color: getPriorityColor(shiftColors[shiftType]) };
    }
  };

  return (
    <Tooltip title={id} arrow>
      <Box
        ref={setNodeRef}
        sx={{
          flexGrow: 1,
          border: isOver ? "2px dashed #3f51b5" : "1px dashed #ccc",
          borderRadius: 1,
          backgroundColor: isOver ? "#e3f2fd" : "#bfdbf0ff",
          padding: 0.5,
          mt: 0.5,
          display: "flex",
          flexWrap: "wrap",
          gap: 0.5,
          minHeight: 40,
          transition: "border 0.15s ease, background-color 0.15s ease",
        }}
      >
        {allVisible.length > 0 ? (
          allVisible.map((emp) => (
            <Chip
              key={`${cellKey}-${emp.id}`}
              label={`${emp.firstName} ${emp.lastName}`}
              onDelete={() => onRemove(cellKey, emp)}
              size="small"
              sx={{
                whiteSpace: "nowrap",
                backgroundColor: highlighted.some((e) => e.id === emp.id)
                  ? "#a5d6a7"
                  : "#1E90FF",
              }}
            />
          ))
        ) : (
          <em style={getUrgencyStyle(shiftType)}>Unassigned</em>
        )}
      </Box>
    </Tooltip>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if these actually change
  if (prevProps.isDragging !== nextProps.isDragging) return false;
  if (prevProps.assigned.length !== nextProps.assigned.length) return false;
  if (prevProps.highlighted.length !== nextProps.highlighted.length) return false;
  
  // Deep compare assigned employee IDs
  const prevIds = prevProps.assigned.map(e => e.id).sort().join(',');
  const nextIds = nextProps.assigned.map(e => e.id).sort().join(',');
  if (prevIds !== nextIds) return false;
  
  // Deep compare highlighted employee IDs
  const prevHighIds = prevProps.highlighted.map(e => e.id).sort().join(',');
  const nextHighIds = nextProps.highlighted.map(e => e.id).sort().join(',');
  if (prevHighIds !== nextHighIds) return false;
  
  return true; // Props are equal, skip re-render
});

DroppableCell.displayName = 'DroppableCell';