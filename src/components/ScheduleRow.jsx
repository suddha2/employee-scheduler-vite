import { memo } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { format } from 'date-fns';
import { DroppableCell } from './droppableCell';
import { parseLocalDate } from '../utils/dates';

const ScheduleRow = memo(({
  row,
  columnWidths,
  weekdayOrder,
  datesByWeekday,
  assignmentMap,
  pinnedMap,
  conflictCells,
  conflictCellInfo,
  findHighlightedEmpId,
  selectedSlotKey,
  onSelectSlot,
  highlighted,
  handleRemove,
  activeDragId,
  virtualRow,
  measureElement,
  changeHighlights,
  clearedCells,
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
              const shiftDateStr = format(parseLocalDate(a.shift.shiftStart), "yyyy-MM-dd");
              return shiftDateStr === dateStr;
            });

            // Dedupe by shift.id so a shift isn't rendered twice
            const uniqueShifts = new Map();
            matching.forEach((assignment) => {
              const shiftId = assignment.shift.id;
              if (!uniqueShifts.has(shiftId)) {
                uniqueShifts.set(shiftId, assignment);
              }
            });

            return Array.from(uniqueShifts.values()).map((assignment) => {
              const shiftDateStr = format(parseLocalDate(assignment.shift.shiftStart), "yyyy-MM-dd");
              const shiftStartTime = assignment.shift.shiftTemplate.startTime;
              const shiftId = assignment.shift.id;
              const cellKey = `${location}|${shiftType}|${shiftDateStr}|${shiftStartTime}|${shiftId}`;
              const droppableId = `cell|${cellKey}`;
              const changeType = changeHighlights[cellKey];
              const cellEmployees = assignmentMap[cellKey] ?? [];

              return (
                <Box
                  key={cellKey}
                  sx={{
                    mb: 1,
                    position: 'relative',
                    borderLeft: changeType ? '3px solid' : 'none',
                    borderLeftColor:
                      changeType === 'ASSIGNED' ? 'success.main' :
                        changeType === 'UNASSIGNED' ? 'warning.main' :
                          changeType === 'REASSIGNED' ? 'info.main' : 'transparent',
                    pl: changeType ? 0.5 : 0,
                    backgroundColor: 'transparent',
                    borderRadius: 1,
                    opacity: 1,
                    transition: 'all 0.3s ease-in-out',
                  }}
                >
                  <Typography variant="caption" fontWeight="bold" display="block">
                    {format(parseLocalDate(assignment.shift.shiftStart), "MMM d")}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    {assignment.shift.shiftTemplate.startTime.slice(0, 5)}-
                    {assignment.shift.shiftTemplate.endTime.slice(0, 5)}
                  </Typography>
                  <DroppableCell
                    id={droppableId}
                    assigned={clearedCells.has(cellKey) ? [] : cellEmployees}
                    pinnedIds={pinnedMap?.[cellKey]}
                    hasConflict={conflictCells?.has(cellKey)}
                    conflictInfo={conflictCellInfo?.get(cellKey)}
                    findHighlightedEmpId={findHighlightedEmpId}
                    isSelectedForFilter={selectedSlotKey === cellKey}
                    onSelectSlot={onSelectSlot ? () => onSelectSlot(cellKey) : undefined}
                    highlighted={highlighted[cellKey] ?? []}
                    onRemove={handleRemove}
                    isDragging={!!activeDragId}
                  />

                  {changeType && (
                    <Chip
                      label={changeType === 'ASSIGNED' ? 'Added' : changeType === 'UNASSIGNED' ? 'Removed' : 'Changed'}
                      size="small"
                      variant="outlined"
                      color={
                        changeType === 'ASSIGNED' ? 'success' :
                          changeType === 'UNASSIGNED' ? 'default' :
                            'info'
                      }
                      sx={{
                        mt: 0.5,
                        fontSize: '0.55rem',
                        height: '18px',
                        '& .MuiChip-label': { px: 0.5 }
                      }}
                    />
                  )}
                </Box>
              );
            });
          })}
        </Box>
      ))}
    </Box>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.activeDragId === nextProps.activeDragId &&
    prevProps.row.key === nextProps.row.key &&
    prevProps.virtualRow.start === nextProps.virtualRow.start &&
    prevProps.assignmentMap === nextProps.assignmentMap &&
    prevProps.pinnedMap === nextProps.pinnedMap &&
    prevProps.conflictCells === nextProps.conflictCells &&
    prevProps.findHighlightedEmpId === nextProps.findHighlightedEmpId &&
    prevProps.selectedSlotKey === nextProps.selectedSlotKey &&
    prevProps.changeHighlights === nextProps.changeHighlights
  );
});

ScheduleRow.displayName = 'ScheduleRow';

export default ScheduleRow;
