import { useCallback, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_ENDPOINTS } from '../api/endpoint';
import { useAuth } from '../contexts/AuthContext';
import { liveSolveApi } from '../api/liveSolve';

/**
 * Drives a live/continuous solving session for one rota (P4).
 *
 * While `live` is true it holds a STOMP subscription to /topic/rota/{rotaId} and
 * exposes the latest streamed best solution (`frame`) plus control actions.
 * Mirrors the existing useRequestUpdates STOMP setup (SockJS + PASETO CONNECT
 * header).
 */
export function useLiveRota(rotaId) {
  const { token } = useAuth();
  const clientRef = useRef(null);

  const [live, setLive] = useState(false); // subscribed + solver started
  const [connected, setConnected] = useState(false);
  const [frame, setFrame] = useState(null); // last LiveRotaUpdate
  const [updatedAt, setUpdatedAt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Subscribe to the rota's live topic while live.
  useEffect(() => {
    if (!live || !token || !rotaId) return undefined;

    const client = new Client({
      webSocketFactory: () => new SockJS(API_ENDPOINTS.websoc),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: async () => {
        setConnected(true);
        // Streamed best solutions.
        client.subscribe(API_ENDPOINTS.liveTopic(rotaId), (message) => {
          try {
            setFrame(JSON.parse(message.body));
            setUpdatedAt(Date.now());
          } catch (err) {
            if (import.meta.env.DEV) console.error('Bad live frame:', err);
          }
        });
        // Lifecycle control events — drop out of live mode if the shared session
        // is stopped by another editor or evicted server-side.
        client.subscribe(API_ENDPOINTS.liveControlTopic(rotaId), (message) => {
          try {
            const evt = JSON.parse(message.body);
            if (evt?.type === 'STOPPED') {
              setLive(false);
              setFrame(null);
              setUpdatedAt(null);
            }
          } catch (err) {
            if (import.meta.env.DEV) console.error('Bad control event:', err);
          }
        });
        // Rehydrate after a server restart: if we still intend to be live but the
        // server has no session for this rota, restart it (reloads from DB).
        try {
          const st = await liveSolveApi.status(rotaId);
          if (!st?.tracked) await liveSolveApi.start(rotaId);
        } catch (err) {
          if (import.meta.env.DEV) console.error('Live rehydrate check failed:', err);
        }
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: (f) => setError(f.headers?.message || 'STOMP error'),
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
      setConnected(false);
    };
  }, [live, token, rotaId]);

  const start = useCallback(async () => {
    if (!rotaId) return;
    setBusy(true);
    setError(null);
    try {
      await liveSolveApi.start(rotaId);
      setLive(true);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }, [rotaId]);

  const stop = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await liveSolveApi.stop(rotaId);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLive(false);
      setFrame(null);
      setUpdatedAt(null);
      setBusy(false);
    }
  }, [rotaId]);

  const snapshot = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      return await liveSolveApi.snapshot(rotaId);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
      throw e;
    } finally {
      setBusy(false);
    }
  }, [rotaId]);

  const assign = useCallback(
    (assignmentId, employeeId, pin = true) => liveSolveApi.assign(rotaId, assignmentId, employeeId, pin),
    [rotaId],
  );
  const pin = useCallback(
    (assignmentId, pinned) => liveSolveApi.pin(rotaId, assignmentId, pinned),
    [rotaId],
  );

  return { live, connected, frame, updatedAt, busy, error, start, stop, snapshot, assign, pin };
}

export default useLiveRota;
