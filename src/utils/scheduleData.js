import { format } from 'date-fns';
import { parseLocalDate } from './dates';

// Build a keyed map of cell -> assigned employees, plus a per-weekday
// list of date strings (sorted), from a flat list of shift assignments.
// Pure: callers store the returned `datesByWeekday` and pass it down to
// row renderers — there is no shared mutable state between component instances.
export function buildAssignmentMap(assignments, weekdayOrder) {
  const map = {};
  const seen = {};
  const datesByWeekday = {};
  weekdayOrder.forEach((day) => { datesByWeekday[day] = []; });

  assignments.forEach(({ shift, employee }) => {
    const location = shift.shiftTemplate.location;
    const shiftType = shift.shiftTemplate.shiftType;
    const date = shift.shiftStart;
    const shiftStartTime = shift.shiftTemplate.startTime;
    const shiftId = shift.id;
    const key = `${location}|${shiftType}|${date}|${shiftStartTime}|${shiftId}`;

    if (!map[key]) {
      map[key] = [];
      seen[key] = new Set();
    }

    // Only add the employee if one is assigned; the cell stays in map either way.
    if (employee && !seen[key].has(employee.id)) {
      map[key].push(employee);
      seen[key].add(employee.id);
    }
  });

  const uniqueDateStrings = Array.from(
    new Set(assignments.map((a) => a.shift.shiftStart))
  );

  uniqueDateStrings.forEach((dateStr) => {
    const weekday = format(parseLocalDate(dateStr), "EEE");
    if (datesByWeekday[weekday] && !datesByWeekday[weekday].includes(dateStr)) {
      datesByWeekday[weekday].push(dateStr);
    }
  });

  Object.keys(datesByWeekday).forEach(day => {
    datesByWeekday[day].sort((a, b) => parseLocalDate(a) - parseLocalDate(b));
  });

  return { assignmentMap: map, datesByWeekday };
}

// Aggregate per-employee shift counts and hours by shift type.
// Returns a new employee list where each employee has a `shiftTypeSummary`
// of the form { [shiftType]: { count, hours } }.
export function setEmpSummary(emplist, assignments) {
  const shiftTypeMap = {};

  assignments.forEach(({ shift, employee }) => {
    if (!employee) return;

    const empId = employee.id;
    const shiftType = shift.shiftTemplate.shiftType;

    if (!shiftTypeMap[empId]) {
      shiftTypeMap[empId] = {};
    }

    if (!shiftTypeMap[empId][shiftType]) {
      shiftTypeMap[empId][shiftType] = { count: 0, hours: 0 };
    }

    shiftTypeMap[empId][shiftType].count += 1;
    shiftTypeMap[empId][shiftType].hours += shift.durationInHours;
  });

  return emplist.map(emp => ({
    ...emp,
    shiftTypeSummary: shiftTypeMap[emp.id] || {}
  }));
}
