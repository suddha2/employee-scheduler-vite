import { memo } from "react";
import { Box, Chip, Tooltip } from "@mui/material";
import PushPinIcon from "@mui/icons-material/PushPin";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useDroppable } from "@dnd-kit/core";
import { shiftColors, shiftTypes, getPriorityColor } from "../components/shiftTypeGrading";

function buildConflictTooltip(conflictInfo) {
  if (!conflictInfo) return 'Same-day shift conflict';
  const names = Array.from(conflictInfo.employees || []).join(', ');
  const peerLabels = (conflictInfo.peers || [])
    .map((p) => `${p.location} · ${p.shiftType} @ ${(p.startTime || '').slice(0, 5)}`)
    .filter((v, i, a) => a.indexOf(v) === i); // dedupe
  const lines = [];
  if (names) lines.push(`Conflict: ${names}`);
  if (peerLabels.length) lines.push(`Clashes with: ${peerLabels.join('; ')}`);
  return lines.join('\n') || 'Same-day shift conflict';
}

// Memoize to prevent re-renders when parent updates
export const DroppableCell = memo(({
  id,
  assigned,
  pinnedIds,
  hasConflict,
  conflictInfo,
  onRemove,
  highlighted,
  isDragging
}) => {
  // Only enable droppable when actively dragging - CRITICAL for performance
  const { isOver, setNodeRef } = useDroppable({ 
    id,
    disabled: !isDragging // Disabled when not dragging = no collision detection overhead
  });
  
  const [, location, shiftType, date, shiftTime,shiftId] = id.split("|");
  const cellKey = `${location}|${shiftType}|${date}|${shiftTime}|${shiftId}`;



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

  const cellBorder = hasConflict
    ? "2px solid #d32f2f"
    : isOver ? "2px dashed #3f51b5" : "1px dashed #ccc";
  const cellBackground = hasConflict
    ? "#ffebee"
    : isOver ? "#e3f2fd" : "#bfdbf0ff";

  return (
    <Tooltip title={hasConflict ? buildConflictTooltip(conflictInfo) : id} arrow>
      <Box
        ref={setNodeRef}
        sx={{
          flexGrow: 1,
          position: 'relative',
          border: cellBorder,
          borderRadius: 1,
          backgroundColor: cellBackground,
          padding: 0.5,
          mt: 0.5,
          display: "flex",
          flexWrap: "wrap",
          gap: 0.5,
          minHeight: 40,
          transition: "border 0.15s ease, background-color 0.15s ease",
        }}
      >
        {hasConflict && (
          <WarningAmberIcon
            sx={{
              position: 'absolute',
              top: 2,
              right: 2,
              fontSize: 16,
              color: 'error.main',
              pointerEvents: 'none',
            }}
          />
        )}
        {allVisible.length > 0 ? (
          allVisible.map((emp) => {
            const isPinned = pinnedIds?.has(emp.id);
            return (
              <Tooltip
                key={`${cellKey}-${emp.id}`}
                title={isPinned ? 'Pinned — solver will preserve this assignment' : ''}
                arrow
                disableHoverListener={!isPinned}
              >
                <Chip
                  label={`${emp.firstName} ${emp.lastName}`}
                  icon={isPinned ? <PushPinIcon sx={{ fontSize: 14 }} /> : undefined}
                  onDelete={() => onRemove(cellKey, emp)}
                  size="small"
                  sx={{
                    whiteSpace: "nowrap",
                    backgroundColor: highlighted.some((e) => e.id === emp.id)
                      ? "#a5d6a7"
                      : "#1976D2",
                    color: '#fff',
                    '& .MuiChip-icon': { color: '#fff' },
                  }}
                />
              </Tooltip>
            );
          })
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

  // Compare pinned IDs: covers the case where saving toggles pin state but
  // the assigned list stays the same.
  const prevPinned = prevProps.pinnedIds ? [...prevProps.pinnedIds].sort().join(',') : '';
  const nextPinned = nextProps.pinnedIds ? [...nextProps.pinnedIds].sort().join(',') : '';
  if (prevPinned !== nextPinned) return false;

  // Conflict flag: cheap reference / boolean comparison.
  if (prevProps.hasConflict !== nextProps.hasConflict) return false;

  return true; // Props are equal, skip re-render
});

DroppableCell.displayName = 'DroppableCell';