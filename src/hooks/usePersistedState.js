import { useState, useEffect, useRef, useCallback } from 'react';

// Screen filters, tabs and selections are kept in browser storage so they
// survive leaving a screen and coming back.
//
//  - 'session' (default): per browser tab, wiped at sign-out (AuthContext
//    calls sessionStorage.clear()).
//  - 'local': survives sign-in; used only for the shared region.
//
// Keys follow `ui:<screen>:<field>`. Sets are stored as { __set__: [...] }.

const SET_TAG = '__set__';

const encode = (value) =>
    JSON.stringify(value, (_k, v) => (v instanceof Set ? { [SET_TAG]: [...v] } : v));

const decode = (raw) =>
    JSON.parse(raw, (_k, v) =>
        v && typeof v === 'object' && Array.isArray(v[SET_TAG]) ? new Set(v[SET_TAG]) : v);

const storageFor = (kind) => {
    try {
        return kind === 'local' ? window.localStorage : window.sessionStorage;
    } catch {
        return null; // storage blocked (private mode, policy)
    }
};

const resolve = (initial) => (typeof initial === 'function' ? initial() : initial);

export function readPersisted(key, initialValue, storage = 'session') {
    try {
        const raw = storageFor(storage)?.getItem(key);
        return raw == null ? resolve(initialValue) : decode(raw);
    } catch {
        return resolve(initialValue);
    }
}

export function writePersisted(key, value, storage = 'session') {
    try {
        storageFor(storage)?.setItem(key, encode(value));
    } catch {
        // quota or blocked storage: the screen still works, it just won't remember
    }
}

export function removePersisted(key, storage = 'session') {
    try {
        storageFor(storage)?.removeItem(key);
    } catch {
        // ignore
    }
}

/**
 * useState that is restored from, and saved to, browser storage.
 *
 * @param {string} key - storage key; when it changes the value is re-read for the new key
 * @param {any|Function} initialValue - used when nothing is stored
 * @param {boolean|{persist?: boolean, storage?: 'session'|'local'}} options
 * @returns {[any, Function, Function]} value, setter, clear (removes it and goes back to initialValue)
 */
export function usePersistedState(key, initialValue, options = true) {
    const { persist = true, storage = 'session' } =
        typeof options === 'boolean' ? { persist: options } : options;

    const load = (k) => (persist ? readPersisted(k, initialValue, storage) : resolve(initialValue));

    const [entry, setEntry] = useState(() => ({ key, value: load(key) }));

    // Key changed (e.g. a different rota id): switch to that key's stored value.
    let current = entry;
    if (entry.key !== key) {
        current = { key, value: load(key) };
        setEntry(current);
    }

    useEffect(() => {
        if (persist) writePersisted(current.key, current.value, storage);
    }, [current, persist, storage]);

    const setValue = useCallback((next) => {
        setEntry((prev) => ({
            key: prev.key,
            value: typeof next === 'function' ? next(prev.value) : next,
        }));
    }, []);

    const initialRef = useRef(initialValue);
    initialRef.current = initialValue;
    const clear = useCallback(() => {
        setEntry((prev) => {
            removePersisted(prev.key, storage);
            return { key: prev.key, value: resolve(initialRef.current) };
        });
    }, [storage]);

    return [current.value, setValue, clear];
}

// ---------------------------------------------------------------------------
// Shared region: pick a region on one screen and the others open on it.

const REGION_KEY = 'ui:region';

// First run after this change: carry over the location the pay-cycle screens
// already remembered, so nobody has to pick it again.
const seedRegion = () => {
    for (const legacy of ['paycycle_location', 'archived_paycycle_location']) {
        const old = readPersisted(legacy, null);
        if (old?.label) return old.label;
    }
    return '';
};

/** The region the user last chose anywhere in the app ('' = none yet). */
export function useSharedRegion() {
    return usePersistedState(REGION_KEY, seedRegion, { storage: 'local' });
}

/** Read the shared region without subscribing (for initial values). */
export const getSharedRegion = () => readPersisted(REGION_KEY, seedRegion, 'local') || '';

/** Remember a region choice for the other screens. Ignores '' (an "All" filter). */
export const setSharedRegion = (region) => {
    if (region) writePersisted(REGION_KEY, region, 'local');
};

/**
 * For screens where region is an optional filter (Employees, Shift Templates).
 * The screen remembers its own choice, including "All"; on the first visit it
 * starts on the shared region; choosing a region also updates the shared one.
 */
export function useRegionFilter(screenKey) {
    const [region, setRegion, clear] = usePersistedState(`ui:${screenKey}:region`, getSharedRegion);
    const set = useCallback((value) => {
        setRegion(value);
        setSharedRegion(value);
    }, [setRegion]);
    return [region, set, clear];
}

// ---------------------------------------------------------------------------
// Older helpers, kept for session-expiry save/restore callers.

export function useSaveComponentState(componentKey, stateToSave) {
    useEffect(() => {
        return () => writePersisted(`component_${componentKey}`, stateToSave);
    }, [componentKey, stateToSave]);
}

export function useRestoreComponentState(componentKey) {
    const [restoredState, setRestoredState] = useState(null);

    useEffect(() => {
        const key = `component_${componentKey}`;
        const stored = readPersisted(key, null);
        if (stored != null) {
            setRestoredState(stored);
            removePersisted(key);
        }
    }, [componentKey]);

    return restoredState;
}
