import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useShiftRequestUpdates } from '../hooks/useShiftRequestUpdates';

// App-wide context for incoming shift-request notifications.
//
// The STOMP subscription lives here (one connection for the whole app
// instead of per-page) so we can:
//   - badge the sidebar from any route with the count of new arrivals
//   - let the dedicated Shift Requests page react to the same payload
//     stream without opening a second STOMP client.
//
// API:
//   newCount      number of payloads received since the last markAllRead.
//   lastPayload   the most recent payload (or null). Other components can
//                 useEffect on this to refetch their own list.
//   markAllRead() resets newCount to 0; called by the page when it mounts.
const ShiftRequestsContext = createContext({
  newCount: 0,
  lastPayload: null,
  markAllRead: () => {},
});

export function ShiftRequestsProvider({ children }) {
  const [newCount, setNewCount] = useState(0);
  const [lastPayload, setLastPayload] = useState(null);

  // Stable callback so the underlying STOMP hook doesn't tear down /
  // reopen its client every render. setState updaters take a function so
  // they don't need newCount in the dependency array.
  const handlePayload = useCallback((payload) => {
    if (!payload) return;
    setLastPayload(payload);
    setNewCount((c) => c + 1);
  }, []);

  useShiftRequestUpdates(handlePayload);

  const markAllRead = useCallback(() => setNewCount(0), []);

  const value = useMemo(
    () => ({ newCount, lastPayload, markAllRead }),
    [newCount, lastPayload, markAllRead]
  );

  return (
    <ShiftRequestsContext.Provider value={value}>
      {children}
    </ShiftRequestsContext.Provider>
  );
}

export function useShiftRequestsNotifications() {
  return useContext(ShiftRequestsContext);
}
