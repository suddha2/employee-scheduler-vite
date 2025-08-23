import { useEffect,useRef,useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_ENDPOINTS } from '../api/endpoint';

export function useRequestUpdates(setRequests, updateRequestStatus) {
    const clientRef = useRef(null);
    
  useEffect(() => {
		const client = new Client({
			webSocketFactory: () => new SockJS(`${API_ENDPOINTS.websoc}?token=${localStorage.getItem("token")}`), 
			connectHeaders: { Authorization: `Bearer ${localStorage.getItem("token")}}`, },
			reconnectDelay: 5000,
			debug: (str) => console.log('[STOMP]', str),
			onConnect: () => {
				console.log('✅ Connected to WebSocket');
				

				client.subscribe('/user/queue/req-update', (message) => {
					try {
                        console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$",message);
						const data = JSON.parse(message.body);
						updateRequestStatus(data);
					} catch (err) {
						console.error('Failed to parse message:', err);
					}
				});
			},
			onStompError: (frame) => {
				console.error('❌ STOMP error:', frame.headers['message']);
			}
		});

		client.activate();
		clientRef.current = client;

		return () => {
			clientRef.current?.deactivate();
		};
	}, [setRequests, updateRequestStatus]);
}
