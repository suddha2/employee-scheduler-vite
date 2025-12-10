import { useState, useEffect, useRef } from 'react';

/**
 * Hook that persists state to sessionStorage and automatically restores it
 * @param {string} key - The sessionStorage key
 * @param {any} initialValue - Initial value if nothing in storage
 * @param {boolean} persist - Whether to persist (can be toggled)
 */
export function usePersistedState(key, initialValue, persist = true) {
    // Initialize state from sessionStorage or use initial value
    const [state, setState] = useState(() => {
        if (!persist) return initialValue;
        
        try {
            const stored = sessionStorage.getItem(key);
            return stored ? JSON.parse(stored) : initialValue;
        } catch (error) {
            console.error(`Error loading persisted state for key "${key}":`, error);
            return initialValue;
        }
    });

    // Track if this is the first render
    const isFirstRender = useRef(true);

    // Save to sessionStorage whenever state changes (skip first render)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (persist) {
            try {
                sessionStorage.setItem(key, JSON.stringify(state));
            } catch (error) {
                console.error(`Error persisting state for key "${key}":`, error);
            }
        }
    }, [state, key, persist]);

    // Clear persisted state
    const clearPersistedState = () => {
        try {
            sessionStorage.removeItem(key);
        } catch (error) {
            console.error(`Error clearing persisted state for key "${key}":`, error);
        }
    };

    return [state, setState, clearPersistedState];
}

/**
 * Hook to save and restore component state on session expiry
 * @param {string} componentKey - Unique key for this component
 * @param {object} stateToSave - Object containing state to persist
 */
export function useSaveComponentState(componentKey, stateToSave) {
    useEffect(() => {
        // Save state before unmount (e.g., when token expires)
        return () => {
            try {
                sessionStorage.setItem(`component_${componentKey}`, JSON.stringify(stateToSave));
            } catch (error) {
                console.error(`Error saving component state for "${componentKey}":`, error);
            }
        };
    }, [componentKey, stateToSave]);
}

/**
 * Hook to restore component state after re-login
 * @param {string} componentKey - Unique key for this component
 */
export function useRestoreComponentState(componentKey) {
    const [restoredState, setRestoredState] = useState(null);

    useEffect(() => {
        try {
            const stored = sessionStorage.getItem(`component_${componentKey}`);
            if (stored) {
                setRestoredState(JSON.parse(stored));
                // Clear after restoration to avoid stale data
                sessionStorage.removeItem(`component_${componentKey}`);
            }
        } catch (error) {
            console.error(`Error restoring component state for "${componentKey}":`, error);
        }
    }, [componentKey]);

    return restoredState;
}
