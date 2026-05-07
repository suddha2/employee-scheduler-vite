// Returns an array of { field, from, to } describing how a shift template's
// editable fields have changed relative to its original snapshot.
// Pure function — used by the bulk-update confirmation dialog.
export function getChangedFields(formData, originalFormData) {
  if (!originalFormData) return [];

  const changes = [];

  if (formData.startTime !== originalFormData.startTime) {
    changes.push({
      field: 'Start Time',
      from: originalFormData.startTime,
      to: formData.startTime,
    });
  }
  if (formData.endTime !== originalFormData.endTime) {
    changes.push({
      field: 'End Time',
      from: originalFormData.endTime,
      to: formData.endTime,
    });
  }
  if (formData.breakStart !== originalFormData.breakStart) {
    changes.push({
      field: 'Break Start',
      from: originalFormData.breakStart || 'None',
      to: formData.breakStart || 'None',
    });
  }
  if (formData.breakEnd !== originalFormData.breakEnd) {
    changes.push({
      field: 'Break End',
      from: originalFormData.breakEnd || 'None',
      to: formData.breakEnd || 'None',
    });
  }
  if (formData.totalHours !== originalFormData.totalHours) {
    changes.push({
      field: 'Total Hours',
      from: originalFormData.totalHours || 'Auto',
      to: formData.totalHours || 'Auto',
    });
  }
  if (formData.empCount !== originalFormData.empCount) {
    changes.push({
      field: 'Employee Count',
      from: originalFormData.empCount,
      to: formData.empCount,
    });
  }
  if (formData.priority !== originalFormData.priority) {
    changes.push({
      field: 'Priority',
      from: originalFormData.priority,
      to: formData.priority,
    });
  }
  if (formData.requiredGender !== originalFormData.requiredGender) {
    changes.push({
      field: 'Required Gender',
      from: originalFormData.requiredGender || 'ANY',
      to: formData.requiredGender || 'ANY',
    });
  }
  if (JSON.stringify(formData.requiredSkills) !== JSON.stringify(originalFormData.requiredSkills)) {
    changes.push({
      field: 'Required Skills',
      from: originalFormData.requiredSkills.join(', ') || 'None',
      to: formData.requiredSkills.join(', ') || 'None',
    });
  }
  if (formData.active !== originalFormData.active) {
    changes.push({
      field: 'Active Status',
      from: originalFormData.active ? 'Active' : 'Inactive',
      to: formData.active ? 'Active' : 'Inactive',
    });
  }

  return changes;
}
