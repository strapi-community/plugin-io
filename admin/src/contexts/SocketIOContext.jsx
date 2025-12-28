/**
 * Socket.IO Context Provider for Admin Panel
 * Provides socket connection and presence state to all admin components.
 */
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '@strapi/strapi/admin';

import { PLUGIN_ID } from '../pluginId';

// Context for socket connection
const SocketIOContext = createContext(null);

// Context for presence state
const PresenceContext = createContext(null);

/**
 * Gets the Socket.IO server URL
 * @returns {string} Server URL
 */
const getSocketUrl = () => {
	// In admin panel, connect to the same host
	const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
	return `${window.location.protocol}//${window.location.host}`;
};

/**
 * Socket.IO Provider Component
 * Manages socket connection and provides it to children
 */
export const SocketIOProvider = ({ children }) => {
	const [socket, setSocket] = useState(null);
	const [connected, setConnected] = useState(false);
	const [error, setError] = useState(null);
	const reconnectAttempts = useRef(0);
	const auth = useAuth();

	// Initialize socket connection
	useEffect(() => {
		// Get admin JWT token
		const token = auth?.token;
		
		if (!token) {
			setError('No authentication token available');
			return;
		}

		const socketInstance = io(getSocketUrl(), {
			path: '/socket.io',
			transports: ['websocket', 'polling'],
			auth: {
				token,
				strategy: 'jwt',
				isAdmin: true,
			},
			reconnection: true,
			reconnectionAttempts: 5,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 5000,
		});

		socketInstance.on('connect', () => {
			setConnected(true);
			setError(null);
			reconnectAttempts.current = 0;
			console.info(`[${PLUGIN_ID}] Socket connected:`, socketInstance.id);
		});

		socketInstance.on('disconnect', (reason) => {
			setConnected(false);
			console.info(`[${PLUGIN_ID}] Socket disconnected:`, reason);
		});

		socketInstance.on('connect_error', (err) => {
			setError(err.message);
			reconnectAttempts.current++;
			console.warn(`[${PLUGIN_ID}] Socket connection error:`, err.message);
		});

		setSocket(socketInstance);

		// Cleanup on unmount
		return () => {
			socketInstance.disconnect();
		};
	}, [auth?.token]);

	// Emit wrapper with error handling
	const emit = useCallback((event, data, callback) => {
		if (!socket || !connected) {
			console.warn(`[${PLUGIN_ID}] Cannot emit '${event}': socket not connected`);
			return false;
		}
		socket.emit(event, data, callback);
		return true;
	}, [socket, connected]);

	// Subscribe to an event
	const on = useCallback((event, handler) => {
		if (!socket) return () => {};
		socket.on(event, handler);
		return () => socket.off(event, handler);
	}, [socket]);

	// Unsubscribe from an event
	const off = useCallback((event, handler) => {
		if (!socket) return;
		socket.off(event, handler);
	}, [socket]);

	const value = {
		socket,
		connected,
		error,
		emit,
		on,
		off,
		socketId: socket?.id || null,
	};

	return (
		<SocketIOContext.Provider value={value}>
			{children}
		</SocketIOContext.Provider>
	);
};

/**
 * Hook to access the socket context
 * @returns {object} Socket context value
 */
export const useSocket = () => {
	const context = useContext(SocketIOContext);
	if (!context) {
		throw new Error('useSocket must be used within a SocketIOProvider');
	}
	return context;
};

/**
 * Presence Provider Component
 * Manages presence state for entities being edited
 */
export const PresenceProvider = ({ children }) => {
	const { socket, connected, emit, on } = useSocket();
	const [currentEntity, setCurrentEntity] = useState(null);
	const [editors, setEditors] = useState([]);
	const [isJoined, setIsJoined] = useState(false);
	const heartbeatInterval = useRef(null);

	// Handle presence updates
	useEffect(() => {
		if (!socket) return;

		const handlePresenceUpdate = (data) => {
			if (currentEntity && 
					data.uid === currentEntity.uid && 
					data.documentId === currentEntity.documentId) {
				setEditors(data.editors || []);
			}
		};

		const unsubscribe = on('presence:update', handlePresenceUpdate);
		return () => unsubscribe();
	}, [socket, on, currentEntity]);

	// Heartbeat to keep presence alive
	useEffect(() => {
		if (!connected || !isJoined) {
			if (heartbeatInterval.current) {
				clearInterval(heartbeatInterval.current);
				heartbeatInterval.current = null;
			}
			return;
		}

		heartbeatInterval.current = setInterval(() => {
			emit('presence:heartbeat', {});
		}, 30000); // Every 30 seconds

		return () => {
			if (heartbeatInterval.current) {
				clearInterval(heartbeatInterval.current);
			}
		};
	}, [connected, isJoined, emit]);

	/**
	 * Join an entity for presence tracking
	 * @param {string} uid - Content type UID
	 * @param {string} documentId - Document ID
	 */
	const joinEntity = useCallback((uid, documentId) => {
		if (!connected) return;

		// Leave current entity if different
		if (currentEntity && 
				(currentEntity.uid !== uid || currentEntity.documentId !== documentId)) {
			emit('presence:leave', {
				uid: currentEntity.uid,
				documentId: currentEntity.documentId,
			});
		}

		emit('presence:join', { uid, documentId }, (response) => {
			if (response?.success) {
				setCurrentEntity({ uid, documentId });
				setEditors(response.editors || []);
				setIsJoined(true);
			}
		});
	}, [connected, currentEntity, emit]);

	/**
	 * Leave the current entity
	 */
	const leaveEntity = useCallback(() => {
		if (!connected || !currentEntity) return;

		emit('presence:leave', {
			uid: currentEntity.uid,
			documentId: currentEntity.documentId,
		});

		setCurrentEntity(null);
		setEditors([]);
		setIsJoined(false);
	}, [connected, currentEntity, emit]);

	/**
	 * Send typing indicator
	 * @param {string} fieldName - Name of field being edited
	 */
	const sendTyping = useCallback((fieldName) => {
		if (!connected || !currentEntity) return;

		emit('presence:typing', {
			uid: currentEntity.uid,
			documentId: currentEntity.documentId,
			fieldName,
		});
	}, [connected, currentEntity, emit]);

	const value = {
		currentEntity,
		editors,
		isJoined,
		joinEntity,
		leaveEntity,
		sendTyping,
		editorCount: editors.length,
		hasOtherEditors: editors.filter(e => e.socketId !== socket?.id).length > 0,
	};

	return (
		<PresenceContext.Provider value={value}>
			{children}
		</PresenceContext.Provider>
	);
};

/**
 * Hook to access the presence context
 * @returns {object} Presence context value
 */
export const usePresenceContext = () => {
	const context = useContext(PresenceContext);
	if (!context) {
		throw new Error('usePresenceContext must be used within a PresenceProvider');
	}
	return context;
};

/**
 * Combined provider for Socket.IO and Presence
 */
export const SocketIOPresenceProvider = ({ children }) => {
	return (
		<SocketIOProvider>
			<PresenceProvider>
				{children}
			</PresenceProvider>
		</SocketIOProvider>
	);
};

export default SocketIOContext;
