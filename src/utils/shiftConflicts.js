// Same-day shift compatibility rules, kept identical to the backend's
// validator and the drag-drop checkForConflicts logic.
//
// Returns true when a list of shifts (all on the same day, for the same
// employee) is a legal combination.
export function isAllowedDayShiftTypes(shifts) {
  if (!shifts || shifts.length === 0) return true;
  if (shifts.length === 1) return true;

  const types = shifts.map(s => s.shiftType);
  const locations = shifts.map(s => s.location);

  // All FLOATING at different locations: OK.
  const allFloating = types.every(t => t === 'FLOATING');
  if (allFloating) {
    const uniqueLocs = new Set(locations);
    return uniqueLocs.size === locations.length;
  }

  // FLOATING cannot mix with concrete shift types.
  const hasFloating = types.some(t => t === 'FLOATING');
  const hasNonFloating = types.some(t =>
    t === 'DAY' || t === 'LONG_DAY' || t === 'WAKING_NIGHT' || t === 'SLEEP_IN'
  );
  if (hasFloating && hasNonFloating) return false;

  // LONG_DAY + SLEEP_IN at the *same* location is the canonical paired shift.
  if (shifts.length === 2) {
    const hasLongDay = types.includes('LONG_DAY');
    const hasSleepIn = types.includes('SLEEP_IN');
    if (hasLongDay && hasSleepIn) {
      const longDayLoc = shifts.find(s => s.shiftType === 'LONG_DAY')?.location;
      const sleepInLoc = shifts.find(s => s.shiftType === 'SLEEP_IN')?.location;
      return longDayLoc === sleepInLoc;
    }
  }

  // Any other 2+ non-FLOATING combination is invalid.
  if (shifts.length >= 2 && !allFloating) return false;

  return true;
}

// Scans assignmentMap and returns the set of cellKeys that contain at
// least one employee who is double-booked under an invalid same-day
// combination. Conflicts are computed at load time so the schedule view
// can mark them before any drag interaction.
export function findConflictCells(assignmentMap) {
  // Group every (employee, date) appearance with its source cell.
  const byEmpDate = new Map();

  Object.entries(assignmentMap).forEach(([cellKey, employees]) => {
    const parts = cellKey.split('|');
    if (parts.length !== 5) return;
    const [location, shiftType, date, startTime, shiftId] = parts;
    employees.forEach((emp) => {
      const k = `${emp.id}|${date}`;
      if (!byEmpDate.has(k)) byEmpDate.set(k, []);
      byEmpDate.get(k).push({ cellKey, location, shiftType, date, startTime, shiftId, employee: emp });
    });
  });

  const conflictCells = new Set();
  // cellKey -> { employees: [...names], peers: [{ location, shiftType, startTime }] }
  const cellInfo = new Map();

  byEmpDate.forEach((shifts) => {
    if (shifts.length < 2) return;
    if (isAllowedDayShiftTypes(shifts)) return;

    shifts.forEach((s) => {
      conflictCells.add(s.cellKey);
      if (!cellInfo.has(s.cellKey)) {
        cellInfo.set(s.cellKey, { employees: new Set(), peers: [] });
      }
      const info = cellInfo.get(s.cellKey);
      info.employees.add(`${s.employee.firstName} ${s.employee.lastName}`);
      shifts
        .filter(other => other.cellKey !== s.cellKey)
        .forEach(other => {
          info.peers.push({
            location: other.location,
            shiftType: other.shiftType,
            startTime: other.startTime,
          });
        });
    });
  });

  return { conflictCells, cellInfo };
}
