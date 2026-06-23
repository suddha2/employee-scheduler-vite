import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Paper,
  Typography,
  IconButton,
  Box,
  Collapse,
  Divider,
  TextField,
  Button,
  Stack,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
} from "@mui/material";
import {
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";
import { format } from "date-fns";
import { parseLocalDate } from "../utils/dates";
import { useDraggable, DragOverlay } from "@dnd-kit/core";
import { shiftColors, shiftTypes, getPriorityColor, shiftTypeShortText } from "../components/shiftTypeGrading";

const SHIFT_COLUMN_WIDTH = 24;

function EmployeeItem({
  employee,
  showActions,
  isFindHighlighted,
  onToggleFindHighlight,
  onClearAllForEmployee,
  onUnpinForEmployee,
  regionChip = null,
}) {
  const id = `emp|${employee.id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

  // Compute total allocated hours across all shift types
  const totalHours = Object.values(employee.shiftTypeSummary || {}).reduce(
    (sum, summary) => sum + (summary.hours || 0),
    0
  );

  // Wrapper handler: stop the drag handlers from claiming the click/mousedown
  // so the button row works even though the surrounding row is a drag source.
  const stopAndRun = (fn) => (e) => {
    e.stopPropagation();
    fn?.();
  };

  return (
    <Box
      sx={{
        px: 1,
        py: 0.5,
        mb: 1,
        borderRadius: 1,
        fontSize: 14,
        backgroundColor: isFindHighlighted
          ? 'rgba(237, 108, 2, 0.12)' // warning.light tint when this row is "being found"
          : isDragging
            ? 'primary.light'
            : 'grey.100',
        userSelect: "none",
        transition: "background-color 0.2s",
        outline: isFindHighlighted ? '1px solid #ed6c02' : 'none',
        "&:hover": {
          backgroundColor: isFindHighlighted ? 'rgba(237, 108, 2, 0.18)' : 'grey.200',
        },
      }}
    >
      <Box
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        sx={{
          display: "flex",
          justifyContent: "space-between",
          // flex-start so the shift circles stay anchored to the top while the
          // left column (name + optional region) grows downward as needed.
          alignItems: "flex-start",
          cursor: "grab",
        }}
      >
        {/*
          Left column stacks the name (wraps if long, never truncated) and,
          on the Other Regions tab, the region underneath. Hours pill sits at
          the top-right of this column so it stays close to the name on
          single-line rows but doesn't compete with a wrapped name for space.
        */}
        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0, mr: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                flex: "1 1 auto",
                wordBreak: "break-word",
                lineHeight: 1.2,
              }}
            >
              {employee.firstName} {employee.lastName}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                flexShrink: 0,
                px: 0.6,
                py: 0.2,
                borderRadius: 1,
                backgroundColor: "grey.300",
                color: "text.primary",
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              {totalHours}
            </Typography>
          </Box>
          {regionChip && (
            <Typography
              variant="caption"
              title={regionChip}
              sx={{
                fontSize: 10,
                color: "text.secondary",
                mt: 0.25,
                lineHeight: 1.1,
                fontStyle: "italic",
              }}
            >
              {regionChip}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex" }}>
          {shiftTypes.map((type) => {
            const summary = employee.shiftTypeSummary?.[type];
            const count = summary?.count ?? 0;
            const hours = summary?.hours ?? 0;

            return (
              <Box
                key={type}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: SHIFT_COLUMN_WIDTH,
                  boxSizing: "border-box",
                }}
              >
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    backgroundColor: getPriorityColor(shiftColors[type]),
                    color: "white",
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title={`${type} shift count`}
                >
                  {count}
                </Box>
                <Typography
                  variant="caption"
                  sx={{ fontSize: 10, color: "text.secondary", lineHeight: 1.2 }}
                >
                  {hours}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Inline actions: only rendered while the user is searching, so the
          idle list stays uncluttered. Buttons stopPropagation on click and
          mousedown so they never start a drag. */}
      {showActions && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ mt: 0.75 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Button
            size="small"
            variant={isFindHighlighted ? 'contained' : 'outlined'}
            color="warning"
            onClick={stopAndRun(() => onToggleFindHighlight?.(employee.id))}
            sx={{ flex: 1, fontSize: 11, py: 0.25 }}
          >
            {isFindHighlighted ? 'Stop highlighting' : 'Highlight All'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            onClick={stopAndRun(() => onUnpinForEmployee?.(employee))}
            sx={{ flex: 1, fontSize: 11, py: 0.25 }}
          >
            Unpin All
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={stopAndRun(() => onClearAllForEmployee?.(employee))}
            sx={{ flex: 1, fontSize: 11, py: 0.25 }}
          >
            Unassign All
          </Button>
        </Stack>
      )}
    </Box>
  );
}


export default function FloatingEmployeeList({
  employees = [],
  outOfRegionEmployees = null,
  outOfRegionLoading = false,
  outOfRegionError = null,
  onRequestOutOfRegion,
  findHighlightedEmpId = null,
  onToggleFindHighlight,
  onClearAllForEmployee,
  onUnpinForEmployee,
  slotFilterInfo = null,
  onClearSlotFilter,
}) {
  const [open, setOpen] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const columnWidths = [200, 150, 150, 150, 150, 150, 150, 150];
  const [searchQuery, setSearchQuery] = useState("");
  // 'inRegion' = current rota's employees (existing), 'outOfRegion' = staff
  // from other regions in the same paycycle period. Tab state lives here so
  // the parent doesn't need to track it — parent just provides the data and
  // a lazy-load callback fired on first switch.
  const [activeTab, setActiveTab] = useState("inRegion");
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const NAVBAR_HEIGHT = 64;
  const BOTTOM_BAR_HEIGHT = 56;
  const LIST_HEIGHT = 400; // or measure dynamically if needed
  const LIST_WIDTH = 260;
  const [position, setPosition] = useState({
    top: 250,
    left: window.innerWidth - LIST_WIDTH - 30, // 30px margin from right edge
  });

  const [contractFilter, setContractFilter] = useState("All");

  // Other-Regions-only: optional region filter, plus whether its expandable
  // section is open. Filter persists when toggling tabs (so the user can
  // pop over to "In Region" and back without losing their selection), but
  // resets whenever the underlying list reloads (e.g. switching schedule).
  const [regionFilter, setRegionFilter] = useState(null);
  const [regionFilterOpen, setRegionFilterOpen] = useState(false);

  // Fire the lazy load the first time the out-of-region tab is opened. The
  // parent decides whether to actually fetch (dedupes if already loaded).
  const handleTabChange = (_e, next) => {
    if (!next || next === activeTab) return;
    setActiveTab(next);
    if (next === "outOfRegion" && outOfRegionEmployees == null && !outOfRegionLoading) {
      onRequestOutOfRegion?.();
    }
  };

  const isOutTab = activeTab === "outOfRegion";
  const sourceList = isOutTab ? (outOfRegionEmployees || []) : employees;

  // Reset the region filter when the underlying out-of-region list reloads
  // (parent sets it to null when navigating to a different schedule).
  useEffect(() => {
    setRegionFilter(null);
  }, [outOfRegionEmployees]);

  // Region counts shown next to each filter button. Counts respect the
  // search and contract filters but NOT the region filter itself — so the
  // number reflects "what you'd actually see if you clicked this", and a
  // region only appears if at least one match would be visible.
  const regionCounts = useMemo(() => {
    if (!isOutTab || !outOfRegionEmployees) return [];
    const counts = new Map();
    for (const emp of outOfRegionEmployees) {
      const matchesSearch = `${emp.firstName} ${emp.lastName}`.toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesContract = contractFilter === "All" || emp.contractType === contractFilter;
      const matchesSlot = !slotFilterInfo || !slotFilterInfo.busyIds?.has(emp.id);
      if (!matchesSearch || !matchesContract || !matchesSlot) continue;
      const region = emp.preferredRegion || "(no region)";
      counts.set(region, (counts.get(region) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => a.region.localeCompare(b.region));
  }, [isOutTab, outOfRegionEmployees, searchQuery, contractFilter, slotFilterInfo]);
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

    const rawTop = e.clientY - offset.current.y;
    const rawLeft = e.clientX - offset.current.x;

    const maxTop = window.innerHeight - BOTTOM_BAR_HEIGHT - LIST_HEIGHT;
    const clampedTop = Math.max(NAVBAR_HEIGHT, Math.min(rawTop, maxTop));

    const maxLeft = window.innerWidth - LIST_WIDTH;
    const clampedLeft = Math.max(0, Math.min(rawLeft, maxLeft));

    setPosition({ top: clampedTop, left: clampedLeft });
  };

  const handleMouseUp = () => {
    dragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // Filter employees by search query. `sourceList` toggles between the
  // in-region rota employees and the other-regions list based on the tab.
  const filteredEmployees = sourceList.filter((emp) => {
    const matchesSearch = `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesContract = contractFilter === "All" || emp.contractType === contractFilter;
    // When a slot is selected for filtering, exclude anyone already busy on that date.
    const matchesSlotFilter = !slotFilterInfo || !slotFilterInfo.busyIds?.has(emp.id);
    // Region filter applies only on the Other Regions tab.
    const matchesRegion = !isOutTab || !regionFilter
      || (emp.preferredRegion || "(no region)") === regionFilter;
    return matchesSearch && matchesContract && matchesSlotFilter && matchesRegion;
  });

  // Pretty-print the active slot filter for the inline chip.
  let slotFilterLabel = '';
  if (slotFilterInfo) {
    let dateLabel = slotFilterInfo.date;
    try {
      dateLabel = format(parseLocalDate(slotFilterInfo.date), 'EEE d MMM');
    } catch { /* fallback to raw date string */ }
    slotFilterLabel = `Free on ${dateLabel}`;
  }



 
  return (
    <Paper
      elevation={10}
      sx={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: 260,
        zIndex: 100,
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
          <ToggleButtonGroup
            value={activeTab}
            exclusive
            onChange={handleTabChange}
            size="small"
            fullWidth
            sx={{ mb: 1.5 }}
          >
            <ToggleButton value="inRegion" sx={{ fontSize: 11, py: 0.5 }}>
              In Region
            </ToggleButton>
            <ToggleButton value="outOfRegion" sx={{ fontSize: 11, py: 0.5 }}>
              Other Regions
            </ToggleButton>
          </ToggleButtonGroup>

          {/*
            Region filter — only shown on the Other Regions tab when employees
            are loaded. Sits above the search box because it's typically the
            first cut admins make when looking for cover from another region.
            Counts next to each region reflect the (current) search + contract
            filters so admins don't open an empty one.
          */}
          {isOutTab && regionCounts.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box
                onClick={() => setRegionFilterOpen((v) => !v)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: "grey.100",
                  cursor: "pointer",
                  "&:hover": { backgroundColor: "grey.200" },
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Filter by region
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ ml: 0.5, color: "text.secondary", fontWeight: 400 }}
                  >
                    ({regionCounts.length})
                  </Typography>
                  {regionFilter && (
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ ml: 0.75, color: "primary.main", fontWeight: 500 }}
                    >
                      · {regionFilter}
                    </Typography>
                  )}
                </Typography>
                {regionFilterOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </Box>
              <Collapse in={regionFilterOpen}>
                <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                  <Button
                    size="small"
                    variant={regionFilter === null ? "contained" : "outlined"}
                    // Auto-collapse on any selection so the panel stays tight —
                    // header still shows the active filter, so the user always
                    // knows what's applied.
                    onClick={() => { setRegionFilter(null); setRegionFilterOpen(false); }}
                    sx={{ justifyContent: "flex-start", fontSize: 11, py: 0.25, textTransform: "none" }}
                  >
                    All regions
                  </Button>
                  {regionCounts.map(({ region, count }) => (
                    <Button
                      key={region}
                      size="small"
                      variant={regionFilter === region ? "contained" : "outlined"}
                      onClick={() => { setRegionFilter(region); setRegionFilterOpen(false); }}
                      sx={{
                        justifyContent: "space-between",
                        fontSize: 11,
                        py: 0.25,
                        textTransform: "none",
                      }}
                    >
                      <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {region}
                      </Box>
                      <Box component="span" sx={{ ml: 1, opacity: 0.8 }}>{count}</Box>
                    </Button>
                  ))}
                </Stack>
              </Collapse>
            </Box>
          )}

          <TextField
            size="small"
            placeholder="Search employees..."
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            select
            label="Contract Type"
            size="small"
            fullWidth
            value={contractFilter}
            onChange={(e) => setContractFilter(e.target.value)}
            SelectProps={{ native: true }}
            sx={{ mb: 2 }}
          >
            <option value="All">All</option>
            {[...new Set(sourceList.map(emp => emp.contractType))].filter(Boolean).map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </TextField>

          {slotFilterInfo && (
            <Box sx={{ mb: 2 }}>
              <Chip
                label={slotFilterLabel}
                color="primary"
                size="small"
                variant="outlined"
                onDelete={onClearSlotFilter}
                sx={{ maxWidth: '100%' }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Showing only employees with no shift on this date.
              </Typography>
            </Box>
          )}


          <Box sx={{ maxHeight: 350, overflowY: "auto", position: "relative" }}>
            <Box
              sx={{
                position: "sticky",
                top: 0,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                px: 1,
                py: 0.5,
                fontSize: 13,
                fontWeight: "bold",
                color: "text.secondary",
                backgroundColor: "grey.100",
                borderRadius: 1,
                mb: 1,
              }}
            >
              <Box sx={{ flexGrow: 1 }}>Name</Box>
              <Box sx={{ display: "flex" }}>
                {shiftTypeShortText.map((type) => (
                  <Box
                    key={type}
                    sx={{
                      width: SHIFT_COLUMN_WIDTH,
                      textAlign: "center",
                      boxSizing: "border-box",
                    }}
                  >
                    {type}
                  </Box>
                ))}
              </Box>
            </Box>
            {isOutTab && outOfRegionLoading && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
                <CircularProgress size={14} />
                <Typography variant="body2" color="text.secondary">
                  Loading other regions…
                </Typography>
              </Box>
            )}
            {isOutTab && outOfRegionError && !outOfRegionLoading && (
              <Typography variant="body2" color="error" sx={{ py: 1 }}>
                Couldn't load other-region employees. Retry by switching tabs.
              </Typography>
            )}
            {!(isOutTab && outOfRegionLoading) && filteredEmployees.length > 0 && (
              filteredEmployees.map((emp) => (
                <EmployeeItem
                  key={emp.id}
                  employee={emp}
                  // Action buttons (highlight / unpin / unassign) only make sense
                  // for employees with assignments in THIS rota — suppress them
                  // on the Other Regions tab.
                  showActions={!isOutTab && searchQuery.trim().length > 0}
                  isFindHighlighted={findHighlightedEmpId === emp.id}
                  onToggleFindHighlight={onToggleFindHighlight}
                  onClearAllForEmployee={onClearAllForEmployee}
                  onUnpinForEmployee={onUnpinForEmployee}
                  regionChip={isOutTab ? emp.preferredRegion : null}
                />
              ))
            )}
            {!(isOutTab && outOfRegionLoading) && filteredEmployees.length === 0 && !outOfRegionError && (
              <Typography variant="body2" color="text.secondary">
                No employees found.
              </Typography>
            )}
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
}
