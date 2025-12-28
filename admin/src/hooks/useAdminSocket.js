/**
 * Custom hook for Socket.IO connection in Admin Panel
 * Provides simplified socket access with automatic reconnection and error handling.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '@strapi/strapi/admin';

import { PLUGIN_ID } from '../pluginId';

/**
 * Hook for managing Socket.IO connection in admin panel
 * @param {object} options - Connection options
 * @returns {object} Socket state and methods
 */
export const useAdminSocket = (options = {}) => {
	const {
		autoConnect = true,
		namespace = '/',
		reconnectionAttempts = 5,
	} = options;

	const [socket, setSocket] = useState(null);
	const [connected, setConnected] = useState(false);
	const [error, setError] = useState(null);
	const [reconnecting, setReconnecting] = useState(false);
	const auth = useAuth();
	const socketRef = useRef(null);

	/**
	 * Creates and returns a new socket connection
	 */
	const connect = useCallback(() => {
		const token = auth?.token;
		
		if (!token) {
			setError('No authentication token');
			return null;
		}

		// Disconnect existing socket
		if (socketRef.current) {
			socketRef.current.disconnect();
		}

		const socketUrl = `${window.location.protocol}//${window.location.host}${namespace === '/' ? '' : namespace}`;
		
		const newSocket = io(socketUrl, {
			path: '/socket.io',
			transports: ['websocket', 'polling'],
			auth: {
				token,
				strategy: 'jwt',
				isAdmin: true,
			},
			reconnection: true,
			reconnectionAttempts,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 5000,
			timeout: 20000,
		});

		// Connection events
		newSocket.on('connect', () => {
			setConnected(true);
			setError(null);
			setReconnecting(false);
			console.info(`[${PLUGIN_ID}] Admin socket connected`);
		});

		newSocket.on('disconnect', (reason) => {
			setConnected(false);
			console.info(`[${PLUGIN_ID}] Admin socket disconnected:`, reason);
		});

		newSocket.on('connect_error', (err) => {
			setError(err.message);
			console.warn(`[${PLUGIN_ID}] Admin socket error:`, err.message);
		});

		newSocket.on('reconnecting', (attempt) => {
			setReconnecting(true);
			console.info(`[${PLUGIN_ID}] Reconnecting... attempt ${attempt}`);
		});

		newSocket.on('reconnect', () => {
			setReconnecting(false);
			console.info(`[${PLUGIN_ID}] Reconnected`);
		});

		newSocket.on('reconnect_failed', () => {
			setReconnecting(false);
			setError('Failed to reconnect');
		});

		socketRef.current = newSocket;
		setSocket(newSocket);
		return newSocket;
	}, [auth?.token, namespace, reconnectionAttempts]);

	/**
	 * Disconnects the socket
	 */
	const disconnect = useCallback(() => {
		if (socketRef.current) {
			socketRef.current.disconnect();
			socketRef.current = null;
			setSocket(null);
			setConnected(false);
		}
	}, []);

	/**
	 * Emits an event with optional callback
	 */
	const emit = useCallback((event, data, callback) => {
		if (!socketRef.current?.connected) {
			console.warn(`[${PLUGIN_ID}] Cannot emit '${event}': not connected`);
			if (callback) callback({ success: false, error: 'Not connected' });
			return false;
		}
		socketRef.current.emit(event, data, callback);
		return true;
	}, []);

	/**
	 * Subscribes to an event
	 */
	const on = useCallback((event, handler) => {
		if (!socketRef.current) return () => {};
		socketRef.current.on(event, handler);
		return () => socketRef.current?.off(event, handler);
	}, []);

	/**
	 * Unsubscribes from an event
	 */
	const off = useCallback((event, handler) => {
		socketRef.current?.off(event, handler);
	}, []);

	/**
	 * Emits and waits for acknowledgment (Promise-based)
	 */
	const emitAsync = useCallback((event, data) => {
		return new Promise((resolve, reject) => {
			if (!socketRef.current?.connected) {
				reject(new Error('Not connected'));
				return;
			}
			
			const timeout = setTimeout(() => {
				reject(new Error('Request timeout'));
			}, 10000);

			socketRef.current.emit(event, data, (response) => {
				clearTimeout(timeout);
				if (response?.success === false) {
					reject(new Error(response.error || 'Request failed'));
				} else {
					resolve(response);
				}
			});
		});
	}, []);

	// Auto-connect on mount
	useEffect(() => {
		if (autoConnect && auth?.token) {
			connect();
		}

		return () => {
			disconnect();
		};
	}, [autoConnect, auth?.token, connect, disconnect]);

	return {
		socket,
		connected,
		error,
		reconnecting,
		connect,
		disconnect,
		emit,
		emitAsync,
		on,
		off,
		socketId: socket?.id || null,
	};
};

export default useAdminSocket;
