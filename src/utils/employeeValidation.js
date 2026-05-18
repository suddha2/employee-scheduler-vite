// Pure validation for the employee form. Returns an errors object;
// the form decides when to surface them.
export function validateEmployee(formData, serviceWeights) {
  const errors = {};

  if (!formData.firstName?.trim()) errors.firstName = 'First name is required';
  if (!formData.lastName?.trim()) errors.lastName = 'Last name is required';
  if (!formData.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
    errors.email = 'Enter a valid email address';
  }
  if (!formData.gender) errors.gender = 'Gender is required';
  if (!formData.contractType) errors.contractType = 'Contract type is required';

  const minHrs = parseFloat(formData.minHrs);
  const maxHrs = parseFloat(formData.maxHrs);

  if (formData.minHrs && isNaN(minHrs)) {
    errors.minHrs = 'Min hours must be a number';
  } else if (minHrs < 0) {
    errors.minHrs = 'Min hours cannot be negative';
  }

  if (formData.maxHrs && isNaN(maxHrs)) {
    errors.maxHrs = 'Max hours must be a number';
  } else if (maxHrs < 0) {
    errors.maxHrs = 'Max hours cannot be negative';
  }

  if (minHrs && maxHrs && minHrs > maxHrs) {
    errors.maxHrs = 'Max hours must be greater than or equal to min hours';
  }

  if (formData.restDays && (isNaN(formData.restDays) || formData.restDays < 0)) {
    errors.restDays = 'Rest days must be a positive number';
  }

  if (formData.daysOn && (isNaN(formData.daysOn) || formData.daysOn < 0)) {
    errors.daysOn = 'Days on must be a positive number';
  }
  if (formData.daysOff && (isNaN(formData.daysOff) || formData.daysOff < 0)) {
    errors.daysOff = 'Days off must be a positive number';
  }
  if (formData.weekOn && (isNaN(formData.weekOn) || formData.weekOn < 0)) {
    errors.weekOn = 'Week on must be a positive number';
  }
  if (formData.weekOff && (isNaN(formData.weekOff) || formData.weekOff < 0)) {
    errors.weekOff = 'Week off must be a positive number';
  }

  const invalidWeights = serviceWeights.filter(sw => {
    const weight = parseInt(sw.weight);
    return isNaN(weight) || weight < 0 || weight > 100;
  });
  if (invalidWeights.length > 0) {
    errors.serviceWeights = 'All service weights must be between 0 and 100';
  }

  return errors;
}
