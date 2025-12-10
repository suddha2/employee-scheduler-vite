import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_ENDPOINTS } from '../api/endpoint';

export function useRequestUpdates(setRequests, updateRequestStatus) {
    const clientRef = useRef(null);
    
    useEffect(() => {
        const token = localStorage.getItem("token");
        
        // Don't connect if no token
        if (!token) {
            console.log('No token found, skipping WebSocket connection');
            return;
        }

        console.log('Initializing WebSocket connection with token');

        const client = new Client({
            webSocketFactory: () => new SockJS(`${API_ENDPOINTS.websoc}?token=${token}`), 
            connectHeaders: { 
                Authorization: `Bearer ${token}` 
            },
            reconnectDelay: 5000,
            debug: (str) => console.log('[STOMP]', str),
            onConnect: () => {
                console.log('✅ Connected to WebSocket');

                client.subscribe('/user/queue/req-update', (message) => {
                    try {
                        const data = JSON.parse(message.body);
                        updateRequestStatus(data);
                    } catch (err) {
                        console.error('Failed to parse message:', err);
                    }
                });
            },
            onStompError: (frame) => {
                console.error('❌ STOMP error:', frame.headers['message']);
                
                // If auth error, disconnect and don't reconnect
                if (frame.headers['message']?.includes('401') || 
                    frame.headers['message']?.includes('Unauthorized')) {
                    console.log('Auth error detected, stopping reconnection attempts');
                    client.deactivate();
                }
            },
            onDisconnect: () => {
                console.log('🔌 WebSocket disconnected');
            }
        });

        client.activate();
        clientRef.current = client;

        return () => {
            console.log('Cleaning up WebSocket connection');
            if (clientRef.current) {
                clientRef.current.deactivate();
                clientRef.current = null;
            }
        };
    }, [setRequests, updateRequestStatus, localStorage.getItem("token")]); // Re-run when token changes

    return clientRef;
}
