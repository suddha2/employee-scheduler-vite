import {
  Box, Chip, Tooltip
} from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
export function DroppableCell({ id, assigned, onRemove, highlighted }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  //console.log(" =========================== DroppableCell rendered for id:", id, "isOver:", isOver, "assigned:", assigned, "highlighted:", highlighted); 
  const [, location, shiftType, date,shiftTime] = id.split("|");
  const cellKey = `${location}|${shiftType}|${date}|${shiftTime}`;

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