import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_ENDPOINTS } from '../api/endpoint';
import { useAuth } from '../contexts/AuthContext';

// Subscribes to the broadcast /topic/shift-requests channel and fires
// `onShiftRequest` with the parsed payload. Caller is responsible for
// filtering by rotaId.
//
// Pass a stable `onShiftRequest` (useCallback); changing it tears down
// and reopens the STOMP client.
export function useShiftRequestUpdates(onShiftRequest) {
  const clientRef = useRef(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(API_ENDPOINTS.websoc),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/topic/shift-requests', (message) => {
          try {
            onShiftRequest(JSON.parse(message.body));
          } catch (err) {
            if (import.meta.env.DEV) console.error('shift-request parse failed:', err);
          }
        });
      },
      onStompError: (frame) => {
        if (import.meta.env.DEV) console.error('STOMP error:', frame.headers['message']);
        if (frame.headers['message']?.includes('401') ||
            frame.headers['message']?.includes('Unauthorized')) {
          client.deactivate();
        }
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
    };
  }, [token, onShiftRequest]);

  return clientRef;
}
