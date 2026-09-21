// Same-day shift compatibility — data-driven, kept in step with the backend
// (PinValidationService + the solver's "Overlapping shifts" rule).
//
// A carer's shifts on the same day are a legal combination unless two of them
// OVERLAP IN TIME (overnight-aware). This replaced the old enum matrix, which
// had no concept of new shift types (e.g. SHIFT_LEAD) and wrongly flagged
// non-overlapping combinations such as a 09:00–17:00 lead shift plus a 22:00
// waking night. Non-overlapping combos are governed by rest/hour rules, not here.

const HHMMSS = (t) => (t ? String(t).slice(0, 8).padEnd(8, ':00').slice(0, 8) : '00:00:00');

// [startMinutes, endMinutes) since midnight of the shift's start date; an end at
// or before the start means the shift runs past midnight, so push it a day on.
function interval(shift) {
  const toMin = (t) => {
    const [h, m] = HHMMSS(t).split(':');
    return Number(h) * 60 + Number(m);
  };
  const start = toMin(shift.startTime);
  let end = toMin(shift.endTime || shift.startTime);
  if (end <= start) end += 24 * 60; // overnight
  return [start, end];
}

function overlaps(a, b) {
  const [as, ae] = interval(a);
  const [bs, be] = interval(b);
  return as < be && bs < ae;
}

// Returns true when a list of shifts (same employee, same day) is legal, i.e. no
// two overlap in time. Each shift needs { startTime, endTime }.
export function isAllowedDayShiftTypes(shifts) {
  if (!shifts || shifts.length < 2) return true;
  for (let i = 0; i < shifts.length; i++) {
    for (let j = i + 1; j < shifts.length; j++) {
      if (overlaps(shifts[i], shifts[j])) return false;
    }
  }
  return true;
}

// Scans assignmentMap and returns the set of cellKeys where an employee is
// double-booked with a time overlap on the same day. `shiftInfoById` maps a
// shiftId to { startTime, endTime } so the check has real end times (the cellKey
// only carries the start time); missing end times fall back to the start.
export function findConflictCells(assignmentMap, shiftInfoById = {}) {
  const byEmpDate = new Map();

  Object.entries(assignmentMap).forEach(([cellKey, employees]) => {
    const parts = cellKey.split('|');
    if (parts.length !== 5) return;
    const [location, shiftType, date, startTime, shiftId] = parts;
    const endTime = shiftInfoById[shiftId]?.endTime || '';
    employees.forEach((emp) => {
      const k = `${emp.id}|${date}`;
      if (!byEmpDate.has(k)) byEmpDate.set(k, []);
      byEmpDate.get(k).push({ cellKey, location, shiftType, date, startTime, endTime, shiftId, employee: emp });
    });
  });

  const conflictCells = new Set();
  // cellKey -> { employees: Set<name>, peers: [{ location, shiftType, startTime }] }
  const cellInfo = new Map();

  byEmpDate.forEach((shifts) => {
    if (shifts.length < 2) return;

    shifts.forEach((s) => {
      // Peers this shift actually overlaps with.
      const clashing = shifts.filter((other) => other.cellKey !== s.cellKey && overlaps(s, other));
      if (clashing.length === 0) return;

      conflictCells.add(s.cellKey);
      if (!cellInfo.has(s.cellKey)) {
        cellInfo.set(s.cellKey, { employees: new Set(), peers: [] });
      }
      const info = cellInfo.get(s.cellKey);
      info.employees.add(`${s.employee.firstName} ${s.employee.lastName}`);
      clashing.forEach((other) => {
        info.peers.push({ location: other.location, shiftType: other.shiftType, startTime: other.startTime });
      });
    });
  });

  return { conflictCells, cellInfo };
}
