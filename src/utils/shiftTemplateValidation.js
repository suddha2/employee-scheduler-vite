// Pure validation for the shift-template form. Returns an errors object.
// `bulkEditMode` is true when the form is editing multiple templates at once,
// in which case the day-of-week field is implicit and skipped.
export function validateShiftTemplate(formData, bulkEditMode) {
  const errors = {};

  if (!formData.location.trim()) {
    errors.location = 'Location is required';
  }
  if (!formData.region.trim()) {
    errors.region = 'Region is required';
  }
  if (!formData.shiftType) {
    errors.shiftType = 'Shift type is required';
  }
  if (!bulkEditMode && (!formData.daysOfWeek || formData.daysOfWeek.length === 0)) {
    errors.dayOfWeek = 'At least one day is required';
  }
  if (!formData.startTime) {
    errors.startTime = 'Start time is required';
  }
  if (!formData.endTime) {
    errors.endTime = 'End time is required';
  }
  if (!formData.empCount || formData.empCount < 1) {
    errors.empCount = 'Employee count must be at least 1';
  }
  if (!formData.priority || formData.priority < 1) {
    errors.priority = 'Priority must be at least 1';
  }

  return errors;
}
