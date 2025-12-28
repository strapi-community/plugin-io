/**
 * Custom hook for presence tracking in Admin Panel
 * Tracks which users are editing which entities.
 */
import { useEffect, useState, useCallback, useRef } from 'react';

import { useAdminSocket } from './useAdminSocket';
import { PLUGIN_ID } from '../pluginId';

/**
 * Hook for tracking presence on a specific entity
 * @param {string} uid - Content type UID
 * @param {string} documentId - Document ID
 * @param {object} options - Options
 * @returns {object} Presence state and methods
 */
export const usePresence = (uid, documentId, options = {}) => {
	const {
		autoJoin = true,
		heartbeatInterval = 30000,
	} = options;

	const { socket, connected, emit, on, socketId } = useAdminSocket();
	const [editors, setEditors] = useState([]);
	const [isJoined, setIsJoined] = useState(false);
	const [typingUsers, setTypingUsers] = useState(new Map()); // socketId -> { fieldName, timestamp }
	const heartbeatRef = useRef(null);
	const typingTimeoutRef = useRef(new Map());

	/**
	 * Join entity for presence tracking
	 */
	const join = useCallback(() => {
		if (!connected || !uid || !documentId) return;

		emit('presence:join', { uid, documentId }, (response) => {
			if (response?.success) {
				setEditors(response.editors || []);
				setIsJoined(true);
				console.info(`[${PLUGIN_ID}] Joined presence for ${uid}:${documentId}`);
			}
		});
	}, [connected, uid, documentId, emit]);

	/**
	 * Leave entity
	 */
	const leave = useCallback(() => {
		if (!connected || !uid || !documentId) return;

		emit('presence:leave', { uid, documentId });
		setIsJoined(false);
		setEditors([]);
		console.info(`[${PLUGIN_ID}] Left presence for ${uid}:${documentId}`);
	}, [connected, uid, documentId, emit]);

	/**
	 * Send typing indicator for a field
	 */
	const sendTyping = useCallback((fieldName) => {
		if (!connected || !isJoined) return;

		emit('presence:typing', { uid, documentId, fieldName });
	}, [connected, isJoined, uid, documentId, emit]);

	/**
	 * Dispatches presence state to the LivePresencePanel via window event
	 */
	const dispatchPresenceState = useCallback((state) => {
		// Store globally for panel initial load
		window.__SOCKET_IO_PRESENCE_STATE__ = state;
		
		// Dispatch event for panel updates
		window.dispatchEvent(new CustomEvent('socket-io-presence-update', {
			detail: state,
		}));
	}, []);

	// Handle presence updates
	useEffect(() => {
		if (!socket || !uid || !documentId) return;

		const handleUpdate = (data) => {
			if (data.uid === uid && data.documentId === documentId) {
				setEditors(data.editors || []);
			}
		};

		const handleTyping = (data) => {
			if (data.uid === uid && data.documentId === documentId) {
				// Update typing users
				setTypingUsers((prev) => {
					const next = new Map(prev);
					next.set(data.user.id, {
						user: data.user,
						fieldName: data.fieldName,
						timestamp: data.timestamp,
					});
					return next;
				});

				// Clear typing after 3 seconds
				const existingTimeout = typingTimeoutRef.current.get(data.user.id);
				if (existingTimeout) clearTimeout(existingTimeout);

				const timeout = setTimeout(() => {
					setTypingUsers((prev) => {
						const next = new Map(prev);
						next.delete(data.user.id);
						return next;
					});
				}, 3000);

				typingTimeoutRef.current.set(data.user.id, timeout);
			}
		};

		const unsubUpdate = on('presence:update', handleUpdate);
		const unsubTyping = on('presence:typing', handleTyping);

		return () => {
			unsubUpdate();
			unsubTyping();
		};
	}, [socket, on, uid, documentId]);

	// Dispatch presence state to panel whenever it changes
	useEffect(() => {
		dispatchPresenceState({
			status: connected ? 'connected' : 'disconnected',
			editors: editors.map(e => ({
				...e,
				isCurrentUser: e.socketId === socketId,
			})),
			typingUsers: Array.from(typingUsers.values()),
			error: null,
		});
	}, [connected, editors, typingUsers, socketId, dispatchPresenceState]);

	// Auto-join on mount or when entity changes
	useEffect(() => {
		if (autoJoin && connected && uid && documentId) {
			join();
		}

		return () => {
			if (isJoined) {
				leave();
			}
		};
	}, [autoJoin, connected, uid, documentId]);

	// Heartbeat to keep presence alive
	useEffect(() => {
		if (!connected || !isJoined) {
			if (heartbeatRef.current) {
				clearInterval(heartbeatRef.current);
				heartbeatRef.current = null;
			}
			return;
		}

		heartbeatRef.current = setInterval(() => {
			emit('presence:heartbeat', {});
		}, heartbeatInterval);

		return () => {
			if (heartbeatRef.current) {
				clearInterval(heartbeatRef.current);
			}
		};
	}, [connected, isJoined, emit, heartbeatInterval]);

	// Cleanup typing timeouts
	useEffect(() => {
		return () => {
			for (const timeout of typingTimeoutRef.current.values()) {
				clearTimeout(timeout);
			}
		};
	}, []);

	// Filter out current user from editors list
	const otherEditors = editors.filter((e) => e.socketId !== socketId);
	const isBeingEditedByOthers = otherEditors.length > 0;

	return {
		editors,
		otherEditors,
		editorCount: editors.length,
		otherEditorCount: otherEditors.length,
		isJoined,
		isBeingEditedByOthers,
		typingUsers: Array.from(typingUsers.values()),
		join,
		leave,
		sendTyping,
	};
};

/**
 * Hook for checking if multiple entities are being edited
 * Useful for list views
 * @returns {object} Methods to check entity editing status
 */
export const usePresenceCheck = () => {
	const { emit, connected } = useAdminSocket();
	const [editingEntities, setEditingEntities] = useState(new Map());

	/**
	 * Check if an entity is being edited
	 */
	const checkEntity = useCallback(async (uid, documentId) => {
		if (!connected) return { isBeingEdited: false, editors: [] };

		return new Promise((resolve) => {
			emit('presence:check', { uid, documentId }, (response) => {
				const result = {
					isBeingEdited: response?.editors?.length > 0,
					editors: response?.editors || [],
				};
				
				// Cache result
				setEditingEntities((prev) => {
					const next = new Map(prev);
					next.set(`${uid}:${documentId}`, result);
					return next;
				});

				resolve(result);
			});
		});
	}, [connected, emit]);

	/**
	 * Get cached editing status for an entity
	 */
	const getEntityStatus = useCallback((uid, documentId) => {
		return editingEntities.get(`${uid}:${documentId}`) || { isBeingEdited: false, editors: [] };
	}, [editingEntities]);

	/**
	 * Clear cached status
	 */
	const clearCache = useCallback(() => {
		setEditingEntities(new Map());
	}, []);

	return {
		checkEntity,
		getEntityStatus,
		clearCache,
		editingEntities,
	};
};

export default usePresence;
