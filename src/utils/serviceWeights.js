// Bidirectional helpers for the legacy "ServiceName:Weight" string format
// stored in employee.preferredService.

// Pull a [{location, weight}] list out of a loaded employee record. Falls
// back to preferredLocations if preferredService doesn't carry the weights.
export function parseServiceWeights(employee) {
  let servicesWithWeights = [];

  if (employee.preferredService && employee.preferredService.length > 0) {
    const firstService = employee.preferredService[0];

    if (typeof firstService === 'string' && firstService.includes(':')) {
      servicesWithWeights = employee.preferredService;
    } else if (employee.preferredLocations && employee.preferredLocations.length > 0) {
      const firstLocation = employee.preferredLocations[0];
      if (typeof firstLocation === 'string' && firstLocation.includes(':')) {
        servicesWithWeights = employee.preferredLocations;
      } else {
        servicesWithWeights = employee.preferredService;
      }
    } else {
      servicesWithWeights = employee.preferredService;
    }
  } else if (employee.preferredLocations && employee.preferredLocations.length > 0) {
    servicesWithWeights = employee.preferredLocations;
  }

  if (typeof servicesWithWeights === 'string') {
    servicesWithWeights = servicesWithWeights.split(',').map(s => s.trim());
  }

  const parsedWeights = servicesWithWeights.map(service => {
    if (typeof service === 'string' && service.includes(':')) {
      const parts = service.split(':');
      const location = parts[0].trim();
      const weight = parts[1] ? parts[1].trim() : '100';
      return { location, weight };
    }
    return { location: String(service).trim(), weight: '100' };
  });

  const serviceNames = parsedWeights.map(sw => sw.location);
  return { parsedWeights, serviceNames };
}

// Serialize back to the wire format the backend expects.
export function serializeServiceWeights(serviceWeights) {
  return serviceWeights.map(sw => `${sw.location}:${sw.weight}`);
}
