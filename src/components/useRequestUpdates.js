import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_ENDPOINTS } from '../api/endpoint';
import { useAuth } from '../contexts/AuthContext';

export function useRequestUpdates(setRequests, updateRequestStatus) {
    const clientRef = useRef(null);
    const { token } = useAuth();

    useEffect(() => {
        if (!token) return;

        const client = new Client({
            webSocketFactory: () => new SockJS(API_ENDPOINTS.websoc),
            connectHeaders: {
                Authorization: `Bearer ${token}`
            },
            reconnectDelay: 5000,
            onConnect: () => {
                client.subscribe('/user/queue/req-update', (message) => {
                    try {
                        const data = JSON.parse(message.body);
                        updateRequestStatus(data);
                    } catch (err) {
                        if (import.meta.env.DEV) console.error('Failed to parse message:', err);
                    }
                });
            },
            onStompError: (frame) => {
                if (import.meta.env.DEV) console.error('STOMP error:', frame.headers['message']);

                if (frame.headers['message']?.includes('401') ||
                    frame.headers['message']?.includes('Unauthorized')) {
                    client.deactivate();
                }
            }
        });

        client.activate();
        clientRef.current = client;

        return () => {
            if (clientRef.current) {
                clientRef.current.deactivate();
                clientRef.current = null;
            }
        };
    }, [token, updateRequestStatus]);

    return clientRef;
}
