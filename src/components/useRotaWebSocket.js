// src/useRotaWebSocket.js
import { useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_ENDPOINTS } from '../api/endpoint';

export const useRotaWebSocket = () => {
	const [rotaData, setRotaData] = useState(null);
	const clientRef = useRef(null);

	useEffect(() => {
		const client = new Client({
			webSocketFactory: () => new SockJS(API_ENDPOINTS.websoc),
			reconnectDelay: 5000,
			debug: (str) => console.log('[STOMP]', str),
			onConnect: () => {
				console.log('✅ Connected to WebSocket');
				client.subscribe('/topic/rotaUpdate', (message) => {
					try {
						const data = JSON.parse(message.body);
						setRotaData(data);
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
	}, []);
	console.log("Rota Data:", rotaData);
	return rotaData;
};
