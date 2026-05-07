import { useState, useEffect, useRef } from 'react';

// Keeps a per-service weight list ([{location, weight}]) in sync with the
// caller's preferredService array. New services default to weight "100";
// removed services are dropped.
//
// Skips the first run via an isInitialMount ref so that an edit-mode load
// path can call setServiceWeights(parsed) without being immediately
// overwritten by the sync effect.
export function useServiceWeights(preferredService) {
  const [serviceWeights, setServiceWeights] = useState([]);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (preferredService && preferredService.length > 0) {
      const newServices = preferredService.filter(
        service => !serviceWeights.some(sw => sw.location === service)
      );

      if (newServices.length > 0) {
        const newWeights = newServices.map(service => ({
          location: service,
          weight: '100',
        }));
        setServiceWeights(prev => [...prev, ...newWeights]);
      }

      const updatedWeights = serviceWeights.filter(
        sw => preferredService.includes(sw.location)
      );

      if (updatedWeights.length !== serviceWeights.length) {
        setServiceWeights(updatedWeights);
      }
    } else {
      setServiceWeights([]);
    }
  }, [preferredService]);

  return [serviceWeights, setServiceWeights];
}
